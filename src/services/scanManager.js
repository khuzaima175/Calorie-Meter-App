// Screen-independent job runner. Device/network adapters are supplied by scanService.
export const MAX_PENDING_SCANS = 3;
const pending = (job) => ['preparing', 'queued', 'analyzing'].includes(job.status);
const abortError = () => Object.assign(new Error('Scan cancelled.'), { name: 'AbortError' });

export function createScanManager(adapter) {
  let jobs = [], ready = false, paused = false, replacing = false;
  let generation = 0, sequence = 0, active = null, initialization = null;
  let writes = Promise.resolve();
  const listeners = new Set(), preparations = new Set(), controllers = new Map(), saving = new Map();
  const emit = () => listeners.forEach((fn) => fn({ jobs: [...jobs], isReady: ready, isPaused: paused }));
  const current = (id, token) => token === generation && jobs.some((j) => j.id === id) && !replacing;
  const update = (id, patch) => { jobs = jobs.map((j) => j.id === id ? { ...j, ...patch } : j); emit(); };
  const write = (fn) => {
    const next = writes.then(fn);
    writes = next.catch(() => {});
    return next;
  };
  const persist = (job, token) => write(async () => {
    if (!current(job.id, token)) throw abortError();
    await adapter.put(job);
  });
  const find = (id) => jobs.find((j) => j.id === id);
  const clean = async (uris) => { if (uris?.length) await adapter.cleanup([...new Set(uris.filter(Boolean))]); };
  const images = (job) => [...(job?.photos || []).map((p) => p.uri), job?.thumbnailUri].filter(Boolean);

  async function pump() {
    if (active || paused || !ready || replacing) return;
    const job = jobs.find((j) => j.status === 'queued');
    if (!job) return;
    const token = generation, controller = new AbortController();
    const run = { id: job.id, controller };
    active = run;
    controllers.set(job.id, controller);
    let acquired = [];
    try {
      update(job.id, { status: 'analyzing', error: null, stage: 'Preparing image' });
      await persist(find(job.id), token);
      const prepared = await adapter.prepare(job, controller.signal);
      acquired = prepared.acquired || [];
      if (!current(job.id, token) || controller.signal.aborted) throw abortError();
      const previousImages = images(find(job.id));
      update(job.id, { photos: prepared.photos || job.photos, thumbnailUri: prepared.thumbnailUri || job.thumbnailUri,
        stage: job.kind === 'barcode' ? 'Looking up product' : 'Analyzing nutrition' });
      await persist(find(job.id), token);
      await clean(previousImages.filter((uri) => !images(find(job.id)).includes(uri)));
      const result = await adapter.analyze({ ...find(job.id), requestPhotos: prepared.requestPhotos }, controller.signal);
      if (!current(job.id, token) || controller.signal.aborted) throw abortError();
      const completed = { ...find(job.id), status: 'ready', stage: 'Ready to review', result, error: null };
      // Persist before advertising a recoverable result.
      await persist(completed, token);
      if (!current(job.id, token)) return;
      update(job.id, completed);
      adapter.onReady?.(completed);
    } catch (error) {
      if (current(job.id, token) && !controller.signal.aborted) {
        const failed = { ...find(job.id), status: 'failed', stage: 'Needs attention', error: error.message || 'Analysis failed. Try again.' };
        try { await persist(failed, token); } catch { /* Keep an actionable draft in memory if storage is full. */ }
        if (current(job.id, token)) update(job.id, failed);
      }
    } finally {
      await clean(acquired).catch(() => {}); // Adapter deletes only unreferenced files.
      if (controllers.get(job.id) === controller) controllers.delete(job.id);
      if (active === run) active = null;
      void pump();
    }
  }

  const api = {
    snapshot: () => ({ jobs: [...jobs], isReady: ready, isPaused: paused }),
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    async initialize() {
      if (initialization) return initialization;
      initialization = (async () => {
        const stored = await adapter.list();
        // Never blindly rerun an interrupted request after a process restart.
        jobs = stored.map((job) => pending(job) ? { ...job, status: 'failed', stage: 'Interrupted', error: 'Scan interrupted. Your photo is saved; tap Retry to continue.' } : job);
        for (const job of jobs) await adapter.put(job);
        ready = true; emit(); void pump();
      })().catch((error) => { initialization = null; throw error; });
      return initialization;
    },
    enqueue(input) {
      if (!ready || replacing) throw new Error('Scans are still loading. Please try again shortly.');
      if (jobs.filter(pending).length >= MAX_PENDING_SCANS) throw new Error('Three scans are already pending. Review your scans or wait for one to finish.');
      const id = `scan-${Date.now()}-${++sequence}-${Math.random().toString(36).slice(2, 8)}`;
      const token = generation, controller = new AbortController();
      const job = { id, kind: input.kind || 'photo', date: input.date, createdAt: new Date().toISOString(),
        context: input.context || {}, text: input.text || '', photos: input.photos || [],
        status: 'preparing', stage: 'Saving your photo', error: null, result: null, draft: null };
      jobs = [...jobs, job]; controllers.set(id, controller); emit();
      const preparation = (async () => {
        let staged = [];
        try {
          staged = await adapter.stage(job.photos, controller.signal);
          if (!current(id, token) || controller.signal.aborted) throw abortError();
          const queued = { ...job, photos: staged, status: 'queued', stage: paused ? 'Waiting for connection' : 'Queued' };
          await persist(queued, token);
          if (current(id, token)) update(id, queued);
        } catch (error) {
          if (current(id, token)) update(id, { status: 'failed', error: error.message, stage: 'Could not save photo' });
          await clean(staged.map((p) => p.uri)).catch(() => {});
        } finally {
          if (controllers.get(id) === controller) controllers.delete(id);
          preparations.delete(preparation); void pump();
        }
      })();
      preparations.add(preparation);
      return id;
    },
    async retry(id) {
      const job = find(id);
      if (!job || job.status !== 'failed' || replacing) return;
      if (jobs.filter(pending).length >= MAX_PENDING_SCANS) throw new Error('The scan queue is full. Wait for a scan to finish.');
      // A failed initial staging attempt may still have temporary source URIs.
      const token = generation, controller = new AbortController();
      controllers.set(id, controller);
      update(id, { status: 'preparing', error: null });
      const preparation = (async () => {
        let staged = [];
        try {
          staged = await adapter.stage(job.photos, controller.signal);
          if (!current(id, token) || controller.signal.aborted) throw abortError();
          const queued = { ...find(id), photos: staged, status: 'queued', stage: 'Queued', error: null };
          await persist(queued, token);
          if (current(id, token)) update(id, queued);
        } catch (error) {
          if (current(id, token)) update(id, { status: 'failed', error: error.message });
          await clean(staged.map((p) => p.uri)).catch(() => {});
        } finally {
          if (controllers.get(id) === controller) controllers.delete(id);
          preparations.delete(preparation); void pump();
        }
      })();
      preparations.add(preparation);
      await preparation;
    },
    async discard(id) {
      if (saving.has(id)) throw new Error('This scan is being saved. Please wait.');
      const job = find(id);
      if (!job) return;
      controllers.get(id)?.abort();
      // Remove immediately so every late callback is invalidated.
      jobs = jobs.filter((j) => j.id !== id); emit();
      try {
        await write(() => adapter.remove(id));
      } catch (error) {
        // A failed deletion must stay visible instead of returning unexpectedly on restart.
        if (!replacing) {
          const restored = { ...job, status: job.status === 'ready' ? 'ready' : 'failed',
            stage: job.status === 'ready' ? 'Ready to review' : 'Needs attention', error: 'Could not discard this scan. Please try again.' };
          jobs = [...jobs, restored]; emit();
          await persist(restored, generation).catch(() => {});
        }
        throw error;
      }
      await clean(images(job)).catch(() => {});
      void pump();
    },
    async setDraft(id, draft) {
      if (find(id)?.status !== 'ready' || replacing) return;
      const token = generation;
      update(id, { draft });
      await persist(find(id), token);
    },
    async describe(id, text) {
      if (find(id)?.status !== 'failed' || !text.trim()) return;
      update(id, { kind: 'text', text: text.trim() });
      await api.retry(id);
    },
    save(id, meal) {
      if (saving.has(id)) return saving.get(id);
      const job = find(id), token = generation;
      if (!job || job.status !== 'ready' || replacing) return Promise.reject(new Error('This scan is not ready to save.'));
      update(id, { status: 'saving' });
      const operation = write(async () => {
        if (!current(id, token)) throw abortError();
        await adapter.complete(job, meal);
        if (current(id, token)) { jobs = jobs.filter((j) => j.id !== id); emit(); }
        // The diary transaction has committed; a cleanup failure must not report a failed save.
        await clean(images(job)).catch(() => {});
      }).catch((error) => {
        if (current(id, token)) update(id, { status: 'ready', error: error.message });
        throw error;
      }).finally(() => saving.delete(id));
      saving.set(id, operation);
      return operation;
    },
    setPaused(value) { paused = Boolean(value); emit(); if (!paused) void pump(); },
    async replaceData(phase) {
      if (phase === 'before') {
        replacing = true; generation++;
        controllers.forEach((controller) => controller.abort()); controllers.clear();
        await Promise.allSettled([...preparations]);
        await writes;
        jobs = []; emit();
      } else {
        jobs = await adapter.list(); replacing = false; emit(); void pump();
      }
    },
  };
  return api;
}

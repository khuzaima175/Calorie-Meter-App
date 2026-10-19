const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-production.cjs');
const { createScanManager } = load()('src/services/scanManager.js');
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
const tick = async () => { for (let i=0;i<12;i++) await new Promise(setImmediate); };
const food = { name:'Daal and roti', meal_type:'lunch', calories:420, protein:18, carbs:60, fat:10, is_water:false };
const input = { date:'2026-10-19', photos:[{ uri:'file:///capture.jpg' }] };
function setup(overrides={}, stored=[]) {
  const records = new Map(stored.map(j => [j.id,j]));
  const requests=[], cleanups=[], saves=[];
  let active=0, maxActive=0;
  const adapter = {
    list:async()=>[...records.values()].map(j=>structuredClone(j)),
    put:async j=>records.set(j.id,structuredClone(j)), remove:async id=>records.delete(id),
    cleanup:async uris=>cleanups.push(...uris), stage:async photos=>photos.map(p=>({...p,uri:'file:///saved.jpg'})),
    prepare:async job=>({ photos:job.photos, requestPhotos:[{base64:'AAAA'}], acquired:[] }),
    analyze:async(job,signal)=>{ const request=deferred(); requests.push({job,signal,...request}); active++; maxActive=Math.max(maxActive,active); try { return await request.promise; } finally { active--; } },
    complete:async(job,meal)=>{ saves.push({job,meal}); records.delete(job.id); },
    ...overrides,
  };
  const manager=createScanManager(adapter);
  return {manager,records,requests,cleanups,saves,adapter,maxActive:()=>maxActive};
}

test('A scan retains its photo/date and completes without any screen subscription', async()=>{
  const h=setup(); await h.manager.initialize(); const id=h.manager.enqueue(input);
  assert.equal(h.manager.snapshot().jobs[0].photos[0].uri,input.photos[0].uri);
  const unsubscribe=h.manager.subscribe(()=>{}); unsubscribe();
  await tick(); assert.equal(h.requests[0].job.date,'2026-10-19');
  h.requests[0].resolve(food); await tick();
  assert.equal(h.manager.snapshot().jobs.find(j=>j.id===id).status,'ready');
  assert.equal(h.records.get(id).result.name,food.name);
  assert.equal(h.saves.length,0,'AI completion must never log a meal automatically');
});

test('Three pending jobs are bounded, analysis is serial, and ready drafts free capacity',async()=>{
  const h=setup(); await h.manager.initialize();
  h.manager.enqueue(input); h.manager.enqueue(input); h.manager.enqueue(input);
  assert.throws(()=>h.manager.enqueue(input),/Three scans/);
  await tick(); assert.equal(h.requests.length,1);
  h.requests[0].resolve(food); await tick(); assert.equal(h.requests.length,2);
  h.manager.enqueue(input); assert.equal(h.maxActive(),1);
  h.requests[1].resolve(food); await tick(); h.requests[2].resolve(food); await tick(); h.requests[3].resolve(food); await tick();
});

test('Cancelling during staging prevents the request and removes late staged media',async()=>{
  const stage=deferred(); const h=setup({stage:()=>stage.promise}); await h.manager.initialize();
  const id=h.manager.enqueue(input); await h.manager.discard(id);
  stage.resolve([{uri:'file:///late.jpg'}]); await tick();
  assert.equal(h.manager.snapshot().jobs.length,0); assert.equal(h.records.size,0); assert.equal(h.requests.length,0);
  assert.ok(h.cleanups.includes('file:///late.jpg'));
});

test('Cancelling aborts the active request and a late result cannot overwrite another job',async()=>{
  const h=setup(); await h.manager.initialize(); const old=h.manager.enqueue(input); await tick();
  await h.manager.discard(old); assert.equal(h.requests[0].signal.aborted,true);
  const next=h.manager.enqueue(input); h.requests[0].resolve({...food,name:'stale'}); await tick();
  h.requests[1].resolve(food); await tick();
  assert.deepEqual(h.manager.snapshot().jobs.map(j=>j.id),[next]); assert.equal(h.records.get(next).result.name,food.name);
});

test('Restart restores ready drafts and requires explicit retry for interrupted analysis',async()=>{
  const h=setup(); await h.manager.initialize(); const id=h.manager.enqueue(input); await tick();
  const restarted=setup({},[...h.records.values()]); await restarted.manager.initialize();
  assert.equal(restarted.manager.snapshot().jobs[0].status,'failed'); assert.equal(restarted.requests.length,0);
  await restarted.manager.retry(id); await tick(); assert.equal(restarted.requests.length,1);
  restarted.requests[0].resolve(food); await tick();
  await restarted.manager.setDraft(id,{name:'My edited lunch',calories:'430'});
  const reopened=setup({},[...restarted.records.values()]); await reopened.manager.initialize();
  assert.equal(reopened.manager.snapshot().jobs[0].draft.name,'My edited lunch'); assert.equal(reopened.requests.length,0);
  h.requests[0].resolve(food); await tick();
});

test('A failed save stays reviewable and simultaneous saves share one write',async()=>{
  let fail=true; const write=deferred(); let writes=0;
  const h=setup({complete:async()=>{writes++; if(fail)throw new Error('disk full'); await write.promise;}});
  await h.manager.initialize(); const id=h.manager.enqueue(input); await tick(); h.requests[0].resolve(food); await tick();
  await assert.rejects(h.manager.save(id,food),/disk full/); assert.equal(h.manager.snapshot().jobs[0].status,'ready');
  fail=false; const first=h.manager.save(id,food), second=h.manager.save(id,food); assert.equal(first,second);
  await tick(); assert.equal(writes,2); write.resolve(); await first; assert.equal(h.manager.snapshot().jobs.length,0);
});

test('Data replacement invalidates in-flight callbacks and blocks new captures',async()=>{
  const h=setup(); await h.manager.initialize(); h.manager.enqueue(input); await tick();
  await h.manager.replaceData('before'); assert.throws(()=>h.manager.enqueue(input),/still loading/);
  h.records.clear(); await h.manager.replaceData('after');
  h.requests[0].resolve(food); await tick(); assert.equal(h.records.size,0); assert.equal(h.manager.snapshot().jobs.length,0);
});

test('An offline queue waits and resumes once connectivity returns',async()=>{
  const h=setup(); await h.manager.initialize(); h.manager.setPaused(true); h.manager.enqueue(input); await tick();
  assert.equal(h.requests.length,0); assert.equal(h.manager.snapshot().jobs[0].status,'queued');
  h.manager.setPaused(false); await tick(); assert.equal(h.requests.length,1); h.requests[0].resolve(food); await tick();
});

test('A storage failure never advertises an unsaved result as ready',async()=>{
  const h=setup({put:async job=>{if(job.status==='ready')throw new Error('quota exceeded');}});
  await h.manager.initialize(); h.manager.enqueue(input); await tick(); h.requests[0].resolve(food); await tick();
  assert.equal(h.manager.snapshot().jobs[0].status,'failed'); assert.match(h.manager.snapshot().jobs[0].error,/quota/);
});

test('Failed photo scans can use a text description without losing the original date',async()=>{
  const h=setup(); await h.manager.initialize(); const id=h.manager.enqueue(input); await tick();
  h.requests[0].reject(new Error('No food found')); await tick();
  await h.manager.describe(id,'2 rotis with daal'); await tick();
  assert.equal(h.requests[1].job.kind,'text'); assert.equal(h.requests[1].job.date,input.date); assert.equal(h.requests[1].job.text,'2 rotis with daal');
  h.requests[1].resolve(food); await tick();
});

test('A failed discard restores a visible draft and never restarts cancelled analysis', async()=>{
  const h=setup({remove:async()=>{throw new Error('disk unavailable');}});
  await h.manager.initialize(); const id=h.manager.enqueue(input); await tick();
  await assert.rejects(h.manager.discard(id),/disk unavailable/);
  assert.equal(h.manager.snapshot().jobs[0].status,'failed');
  assert.match(h.manager.snapshot().jobs[0].error,/discard/);
  h.requests[0].resolve(food); await tick();
  assert.equal(h.manager.snapshot().jobs[0].status,'failed');
  assert.equal(h.requests.length,1);
});

test('Media cleanup failure cannot turn a committed diary save into an error',async()=>{
  const h=setup({cleanup:async()=>{throw new Error('media unavailable');}});
  await h.manager.initialize(); const id=h.manager.enqueue(input); await tick();
  h.requests[0].resolve(food); await tick();
  await h.manager.save(id,food);
  assert.equal(h.saves.length,1); assert.equal(h.manager.snapshot().jobs.length,0);
});

import { createScanManager } from './scanManager';
import { listScanJobs, putScanJob, deleteScanJob, completeScanJob, cleanupUnreferencedImages } from './databaseService';
import { stageScanPhotos, prepareScanImages } from './imagePreparationService';
import { analyzeFoodPhoto, analyzeNutritionLabel, parseMealDescription } from './geminiService';
import { lookupBarcode } from './barcodeService';
import { onDataReplacement } from './dataLifecycle';
import { notifyScanReady } from './notificationService';

export const scanManager = createScanManager({
  list: listScanJobs, put: putScanJob, remove: deleteScanJob, complete: completeScanJob,
  cleanup: cleanupUnreferencedImages, stage: stageScanPhotos, prepare: prepareScanImages,
  async analyze(job, signal) {
    const started = Date.now();
    const context = { ...job.context, signal };
    let result;
    if (job.kind === 'label') result = await analyzeNutritionLabel(job.requestPhotos[0].base64, 'image/jpeg', context);
    else if (job.kind === 'text') result = await parseMealDescription(job.text, context);
    else if (job.kind === 'barcode') result = await lookupBarcode(job.text, signal);
    else result = await analyzeFoodPhoto(job.requestPhotos, 'image/jpeg', context);
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.info('[Scan timing]', { requestMs: Date.now() - started, kind: job.kind });
    return result;
  },
  onReady: (job) => { void notifyScanReady(job.id).catch(() => {}); },
});
onDataReplacement((phase) => scanManager.replaceData(phase));

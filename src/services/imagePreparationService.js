import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { persistImageAsync, resolveImageUriAsync, readImageBase64Async } from './imageService';
import { cleanupUnreferencedImages } from './databaseService';

const check = (signal) => { if (signal.aborted) throw Object.assign(new Error('Scan cancelled.'), { name: 'AbortError' }); };
export function boundedResize(width, height, maxEdge) {
  if (!(width > 0 && height > 0)) throw new Error('Could not read photo dimensions.');
  if (Math.max(width, height) <= maxEdge) return [];
  return [{ resize: width >= height ? { width: maxEdge } : { height: maxEdge } }];
}
const dimensions = (uri) => new Promise((resolve, reject) => Image.getSize(uri, (width, height) => resolve({ width, height }), reject));

export async function stageScanPhotos(photos, signal) {
  const saved = [];
  try {
    for (const photo of photos) {
      check(signal);
      const uri = await persistImageAsync(photo.uri);
      saved.push({ uri, mimeType: photo.mimeType || 'image/jpeg', prepared: Boolean(photo.prepared) });
      check(signal);
    }
    return saved;
  } catch (error) { await cleanupUnreferencedImages(saved.map((p) => p.uri)).catch(() => {}); throw error; }
}

export async function prepareScanImages(job, signal) {
  check(signal);
  // Text fallback must also work when the retained photo itself cannot be decoded.
  if (job.kind === 'text' || job.kind === 'barcode') return { photos: job.photos, thumbnailUri: job.thumbnailUri, requestPhotos: [], acquired: [] };
  if (!job.photos.length) return { photos: [], requestPhotos: [], acquired: [] };
  const photos = [], requestPhotos = [], acquired = [];
  let thumbnailUri = job.thumbnailUri;
  const started = Date.now();
  try {
    for (const photo of job.photos) {
      check(signal);
      if (photo.prepared && thumbnailUri) {
        requestPhotos.push({ mimeType: photo.mimeType, base64: await readImageBase64Async(photo.uri) });
        photos.push(photo);
        continue;
      }
      const resolved = await resolveImageUriAsync(photo.uri);
      if (!resolved) throw new Error('This photo is missing. Choose the image again.');
      try {
        const { width, height } = await dimensions(resolved);
        check(signal);
        const result = await ImageManipulator.manipulateAsync(resolved, boundedResize(width, height, job.kind === 'label' ? 1600 : 896),
          { compress: job.kind === 'label' ? 0.82 : 0.62, format: ImageManipulator.SaveFormat.JPEG, base64: true });
        check(signal);
        const uri = await persistImageAsync(result.uri); acquired.push(uri);
        photos.push({ uri, mimeType: 'image/jpeg', prepared: true });
        requestPhotos.push({ mimeType: 'image/jpeg', base64: result.base64 });
        if (!thumbnailUri) {
          const thumb = await ImageManipulator.manipulateAsync(result.uri, boundedResize(result.width, result.height, 160), { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG });
          thumbnailUri = await persistImageAsync(thumb.uri); acquired.push(thumbnailUri);
        }
        check(signal);
      } finally { if (photo.uri.startsWith('indexeddb://')) URL.revokeObjectURL(resolved); }
    }
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.info('[Scan timing]', { preparationMs: Date.now() - started, photos: photos.length,
      payloadKB: Math.round(requestPhotos.reduce((total, p) => total + (p.base64?.length || 0) * 0.75, 0) / 1024) });
    return { photos, requestPhotos, thumbnailUri, acquired };
  } catch (error) { await cleanupUnreferencedImages(acquired).catch(() => {}); throw error; }
}

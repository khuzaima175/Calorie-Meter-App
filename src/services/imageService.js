import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const MEALS_DIR = `${FileSystem.documentDirectory}meals/`;
const STORE = 'meal_images';
function openWebDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) return reject(new Error('Photo storage is unavailable in this browser.'));
    const request = window.indexedDB.open('CalorieSnapImagesDB', 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Could not open photo storage.'));
    request.onblocked = () => reject(new Error('Photo storage is blocked by another tab.'));
  });
}
async function webOperation(mode, operation) {
  const db = await openWebDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = operation(tx.objectStore(STORE));
      let value;
      request.onsuccess = () => { value = request.result; };
      tx.oncomplete = () => resolve(value);
      tx.onerror = tx.onabort = () => reject(new Error('Could not access photo storage. Check available storage space.'));
    });
  } finally { db.close(); }
}

export async function resolveImageUriAsync(uri) {
  if (!uri || Platform.OS !== 'web' || !uri.startsWith('indexeddb://')) return uri || null;
  const blob = await webOperation('readonly', (store) => store.get(uri.slice(12)));
  return blob ? URL.createObjectURL(blob) : null;
}

export async function persistImageAsync(uri) {
  if (!uri) return null;
  if (Platform.OS === 'web') {
    if (uri.startsWith('indexeddb://') || /^https?:/.test(uri)) return uri;
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Could not read this photo. Choose it again.');
    const blob = await response.blob();
    if (blob.size > 10 * 1024 * 1024) throw new Error('This photo exceeds 10 MB. Choose a smaller photo.');
    const key = `img_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await webOperation('readwrite', (store) => store.put(blob, key));
    return `indexeddb://${key}`;
  }
  if (uri.startsWith(MEALS_DIR) || /^https?:/.test(uri)) return uri;
  const extension = uri.split(/[?#]/)[0].match(/\.([a-zA-Z0-9]{1,5})$/)?.[1] || 'jpg';
  await FileSystem.makeDirectoryAsync(MEALS_DIR, { intermediates: true });
  const target = `${MEALS_DIR}meal_${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;
  try { await FileSystem.copyAsync({ from: uri, to: target }); }
  catch { throw new Error('Could not save this photo. Check available device storage.'); }
  return target;
}

export async function readImageBase64Async(uri) {
  if (Platform.OS !== 'web') return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const resolved = await resolveImageUriAsync(uri);
  if (!resolved) throw new Error('This saved photo is missing. Choose it again.');
  try {
    const response = await fetch(resolved);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Could not read this photo.'));
      reader.readAsDataURL(blob);
    });
  } finally { if (uri.startsWith('indexeddb://')) URL.revokeObjectURL(resolved); }
}

export async function deletePersistedImageAsync(uri) {
  if (!uri) return;
  if (Platform.OS === 'web') {
    if (uri.startsWith('indexeddb://')) await webOperation('readwrite', (store) => store.delete(uri.slice(12)));
  } else if (uri.startsWith(MEALS_DIR)) await FileSystem.deleteAsync(uri, { idempotent: true });
}

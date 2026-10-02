// src/services/imageService.js
// Permanent image persistence helper to avoid OS cache purges on Native and IndexedDB on Web

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const MEALS_DIR = `${FileSystem.documentDirectory}meals/`;
const DB_NAME = 'CalorieSnapImagesDB';
const DB_VERSION = 1;
const STORE_NAME = 'meal_images';

// ----------------------------------------------------
// WEB INDEXED-DB PERSISTENCE HELPER
// ----------------------------------------------------
function openWebDB() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => {
      console.warn('IndexedDB open error:', e);
      resolve(null);
    };
  });
}

async function saveImageToIndexedDB(uri) {
  try {
    const db = await openWebDB();
    if (!db) return null;

    let blob;
    if (uri.startsWith('data:') || uri.startsWith('blob:') || uri.startsWith('http')) {
      const res = await fetch(uri);
      blob = await res.blob();
    } else {
      return uri;
    }

    // Gap B: 10MB size limit check to prevent browser storage starvation
    if (blob.size > 10 * 1024 * 1024) {
      console.warn('Image exceeds 10MB limit for browser storage.');
      return null;
    }

    const key = `img_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(blob, key);

        tx.oncomplete = () => { db.close(); resolve(`indexeddb://${key}`); };
        req.onerror = (err) => {
          // Gap A: Handle QuotaExceededError or private browsing restrictions
          console.warn('IndexedDB write error (quota or storage disabled):', err);
          resolve(null);
        };
        tx.onabort = (e) => {
          console.warn('IndexedDB transaction aborted:', e);
          resolve(null);
        };
      } catch (txErr) {
        console.warn('IndexedDB transaction failed:', txErr);
        resolve(null);
      }
    });
  } catch (err) {
    console.warn('saveImageToIndexedDB error:', err);
    return null;
  }
}

async function deleteImageFromIndexedDB(key) {
  try {
    const db = await openWebDB();
    if (!db) return;
    const cleanKey = key.replace('indexeddb://', '');
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(cleanKey);
  } catch (err) {
    console.warn('deleteImageFromIndexedDB error:', err);
  }
}

/**
 * Resolves an image URI for rendering. If it is an indexeddb:// URI on Web,
 * it pulls the Blob from IndexedDB and creates a displayable Object URL.
 */
export async function resolveImageUriAsync(uri) {
  if (!uri) return null;
  if (Platform.OS !== 'web' || !uri.startsWith('indexeddb://')) {
    return uri;
  }

  try {
    const db = await openWebDB();
    if (!db) return null;
    const cleanKey = uri.replace('indexeddb://', '');

    return new Promise((resolve) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(cleanKey);

      req.onsuccess = (e) => {
        const blob = e.target.result;
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

// ----------------------------------------------------
// NATIVE & WEB UNIFIED PERSISTENCE
// ----------------------------------------------------

/**
 * Copies a temporary camera/gallery image into permanent app storage.
 * - On Native (iOS/Android): Copies into FileSystem.documentDirectory/meals/
 * - On Web: Persists Blob into IndexedDB
 */
export async function persistImageAsync(tempUri) {
  if (!tempUri) return null;

  // Web Browser Persistence via IndexedDB
  if (Platform.OS === 'web') {
    if (tempUri.startsWith('indexeddb://') || (tempUri.startsWith('http') && !tempUri.startsWith('blob:'))) {
      return tempUri;
    }
    const savedUri = await saveImageToIndexedDB(tempUri);
    if (!savedUri) throw new Error('Could not store this photo. Free some device storage and try again.');
    return savedUri;
  }

  // Native iOS / Android Storage
  if (tempUri.startsWith(MEALS_DIR) || tempUri.startsWith('http')) {
    return tempUri;
  }

  try {
    const dirInfo = await FileSystem.getInfoAsync(MEALS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(MEALS_DIR, { intermediates: true });
    }

    const fileExt = tempUri.split('.').pop() || 'jpg';
    const cleanExt = fileExt.includes('?') ? fileExt.split('?')[0] : fileExt;
    const fileName = `meal_${Date.now()}_${Math.random().toString(36).substring(7)}.${cleanExt}`;
    const permanentUri = `${MEALS_DIR}${fileName}`;

    await FileSystem.copyAsync({
      from: tempUri,
      to: permanentUri,
    });

    return permanentUri;
  } catch (err) {
    console.warn('Failed to persist image to permanent storage:', err);
    throw new Error('Could not store this photo permanently. Please try again.');
  }
}

/**
 * Deletes a permanently saved image file when a meal is removed.
 */
export async function deletePersistedImageAsync(imageUri) {
  if (!imageUri) return;

  if (Platform.OS === 'web') {
    if (imageUri.startsWith('indexeddb://')) {
      await deleteImageFromIndexedDB(imageUri);
    }
    return;
  }

  if (!imageUri.startsWith(MEALS_DIR)) {
    return;
  }

  try {
    const info = await FileSystem.getInfoAsync(imageUri);
    if (info.exists) {
      await FileSystem.deleteAsync(imageUri, { idempotent: true });
    }
  } catch (err) {
    console.warn('Failed to delete image file:', err);
  }
}

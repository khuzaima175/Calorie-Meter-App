// src/services/imageService.js
// Permanent image persistence helper to avoid OS cache purges

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const MEALS_DIR = `${FileSystem.documentDirectory}meals/`;

/**
 * Copies a temporary camera/gallery image into permanent app storage.
 * Android and iOS routinely purge the OS cache directory, so images stored
 * only in cache will become broken links after a few days.
 */
export async function persistImageAsync(tempUri) {
  if (!tempUri || Platform.OS === 'web') {
    return tempUri;
  }

  // Already in permanent storage or remote URL
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
    console.warn('Failed to persist image to permanent storage, using original URI:', err);
    return tempUri;
  }
}

/**
 * Deletes a permanently saved image file when a meal is removed.
 */
export async function deletePersistedImageAsync(imageUri) {
  if (!imageUri || Platform.OS === 'web' || !imageUri.startsWith(MEALS_DIR)) {
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

// src/components/CameraScanner.js
// Ultra-fast multi-photo food scanner with Pakistani meal context, time-of-day period detection, and custom notes

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, typography } from '../theme/colors';
import { getCurrentMealPeriod } from '../services/geminiService';

const PORTION_CHIPS = [
  { label: 'Ate 100% (Full)', value: 'Ate full plate (100%)' },
  { label: 'Ate 50% (Half)', value: 'Ate half portion (50%)' },
  { label: 'Ate 40%', value: 'Ate 40% of the portion' },
  { label: '🫒 Light/Olive Oil', value: 'Cooked with light olive oil' },
  { label: '☕ No Sugar', value: 'Beverage prepared without sugar' },
];

export default function CameraScanner({ onCapturePhoto, isProcessing = false }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [photos, setPhotos] = useState([]);
  const [userNote, setUserNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [mealPeriod, setMealPeriod] = useState(getCurrentMealPeriod());
  const cameraRef = useRef(null);

  // Update meal period periodically
  useEffect(() => {
    setMealPeriod(getCurrentMealPeriod());
    const interval = setInterval(() => {
      setMealPeriod(getCurrentMealPeriod());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Helper to resize and compress photos on-device (shrinks 5MB down to ~120KB for 1-2s recognition)
  const optimizeImageForAI = async (uri) => {
    const t0 = Date.now();
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const resizeMs = Date.now() - t0;
      const sizeKb = Math.round(((manipResult.base64?.length || 0) * 0.75) / 1024);
      console.log(`[Perf] ✂️ Photo resized to 1024px in ${resizeMs}ms (JPEG payload: ~${sizeKb} KB)`);
      return {
        uri: manipResult.uri,
        base64: manipResult.base64,
        mimeType: 'image/jpeg',
      };
    } catch (err) {
      console.warn('Image optimization fallback:', err);
      return null;
    }
  };

  // 1. In-App Camera Capture (on-device downscaled to 1024px for sub-second upload)
  const handleTakePhoto = async () => {
    if (!cameraRef.current || isProcessing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const t0 = Date.now();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: true,
      });
      const captureMs = Date.now() - t0;
      console.log(`[Perf] 📸 Hardware camera capture: ${captureMs}ms`);

      if (photo?.uri) {
        const optimized = await optimizeImageForAI(photo.uri);
        const newPhotoItem = optimized || {
          uri: photo.uri,
          base64: photo.base64,
          mimeType: 'image/jpeg',
        };
        setPhotos((prev) => [...prev, newPhotoItem]);
      }
    } catch (err) {
      console.error('Failed to take picture:', err);
      Alert.alert('Camera Error', 'Could not take photo: ' + err.message);
    }
  };

  // 2. Native System Camera App
  const handleLaunchSystemCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const optimized = await optimizeImageForAI(asset.uri);
        if (optimized) {
          setPhotos((prev) => [...prev, optimized]);
        }
      }
    } catch (err) {
      console.error('System camera error:', err);
    }
  };

  // 3. Multi-Image Gallery Picker
  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const newItems = (
          await Promise.all(
            result.assets.map(async (a) => await optimizeImageForAI(a.uri))
          )
        ).filter(Boolean);
        setPhotos((prev) => [...prev, ...newItems]);
      }
    } catch (err) {
      console.error('Gallery error:', err);
    }
  };

  // Remove photo from tray
  const handleRemovePhoto = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit all photos with optional user note & meal period
  const handleAnalyzeAll = () => {
    if (photos.length === 0 || isProcessing) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    onCapturePhoto({
      uri: photos[0].uri,
      base64: photos[0].base64,
      mimeType: photos[0].mimeType || 'image/jpeg',
      photos,
      userNote: userNote.trim(),
      mealPeriod,
    });
  };

  const handleApplyChip = (chipValue) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (userNote.includes(chipValue)) {
      setUserNote((prev) => prev.replace(chipValue, '').trim());
    } else {
      setUserNote((prev) => (prev ? `${prev}, ${chipValue}` : chipValue));
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.sageBright} />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera permission is required to scan meals</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Camera Viewport Full-Bleed */}
      <CameraView
        ref={cameraRef}
        style={styles.cameraView}
        facing={facing}
      />

      {/* 2. Top Meal Period & Time Context Pill */}
      <View style={styles.topPeriodBadge}>
        <Ionicons
          name={mealPeriod.mealType === 'breakfast' ? 'sunny' : mealPeriod.mealType === 'dinner' ? 'moon' : 'restaurant'}
          size={13}
          color={colors.sageBright}
        />
        <Text style={styles.topPeriodText}>
          {mealPeriod.label} • {mealPeriod.timeStr}
        </Text>
      </View>

      {/* 3. Bottom Controls & Multi-Photo Tray */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.bottomOverlay}
        pointerEvents="box-none"
      >
        {/* Optional Note & Portion Chips Drawer */}
        <View style={styles.noteSection}>
          {/* Quick Note Toggle */}
          <TouchableOpacity
            style={styles.noteToggleBtn}
            onPress={() => setShowNoteInput(!showNoteInput)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={userNote ? `Meal note: ${userNote}. Tap to edit.` : 'Add portion context or notes'}
            accessibilityHint="Expands portion chips and custom text note input"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.sageBright} />
            <Text style={styles.noteToggleText}>
              {userNote ? `Note: "${userNote}"` : '+ Add Portion Context / Note (e.g. "ate 40%", "light oil")'}
            </Text>
            <Ionicons
              name={showNoteInput ? 'chevron-down' : 'chevron-up'}
              size={14}
              color={colors.textTertiary}
            />
          </TouchableOpacity>

          {/* Expandable Portion Chips & Input */}
          {showNoteInput && (
            <View style={styles.noteInputCard}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {PORTION_CHIPS.map((chip, idx) => {
                  const isSelected = userNote.includes(chip.value);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.portionChip, isSelected && styles.portionChipActive]}
                      onPress={() => handleApplyChip(chip.value)}
                      accessibilityRole="button"
                      accessibilityLabel={chip.label}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={[styles.portionChipText, isSelected && styles.portionChipTextActive]}>
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TextInput
                style={styles.noteTextInput}
                placeholder="Type custom note (e.g. 2 rotis + 1 cup karahi, ate half plate)..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={userNote}
                onChangeText={setUserNote}
                multiline={false}
                accessibilityLabel="Custom meal description or portion note"
              />
            </View>
          )}
        </View>

        {/* Multi-Photo Thumbnail Tray */}
        {photos.length > 0 && (
          <View style={styles.multiPhotoTray}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trayScroll}>
              {photos.map((p, idx) => (
                <View key={idx} style={styles.thumbWrapper}>
                  <Image source={{ uri: p.uri }} style={styles.thumbImage} accessibilityLabel={`Captured plate ${idx + 1}`} />
                  <TouchableOpacity
                    style={styles.thumbDeleteBtn}
                    onPress={() => handleRemovePhoto(idx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove plate photo ${idx + 1}`}
                  >
                    <Ionicons name="close" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.thumbLabel}>Plate {idx + 1}</Text>
                </View>
              ))}

              {photos.length < 4 && (
                <TouchableOpacity
                  style={styles.addMorePhotoBtn}
                  onPress={handleTakePhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Take additional angle photo"
                >
                  <Ionicons name="camera-outline" size={18} color={colors.sageBright} />
                  <Text style={styles.addMorePhotoText}>+ Angle</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Analyze Multi-Photo CTA */}
            <TouchableOpacity
              style={styles.analyzeAllBtn}
              onPress={handleAnalyzeAll}
              disabled={isProcessing}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Analyze ${photos.length} photos with Gemini AI`}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#121214" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color="#121214" />
                  <Text style={styles.analyzeAllBtnText}>
                    Analyze {photos.length} {photos.length === 1 ? 'Plate' : 'Plates'} with AI
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#121214" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Shutter Action Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.diagBtn}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            accessibilityRole="button"
            accessibilityLabel="Flip camera to front or back lens"
          >
            <Ionicons name="camera-reverse" size={20} color="#FFFFFF" />
            <Text style={styles.diagBtnText}>Flip</Text>
          </TouchableOpacity>

          {/* Shutter Button */}
          <TouchableOpacity
            style={styles.shutterBtn}
            onPress={photos.length === 0 ? async () => {
              // Direct single photo snap + instant analysis for convenience
              if (!cameraRef.current || isProcessing) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              try {
                const photo = await cameraRef.current.takePictureAsync({
                  quality: 0.45,
                  base64: true,
                  skipProcessing: true,
                });
                if (photo?.uri && photo?.base64) {
                  onCapturePhoto({
                    uri: photo.uri,
                    base64: photo.base64,
                    mimeType: 'image/jpeg',
                    photos: [{ uri: photo.uri, base64: photo.base64, mimeType: 'image/jpeg' }],
                    userNote: userNote.trim(),
                    mealPeriod,
                  });
                }
              } catch (err) {
                console.error('Direct capture error:', err);
                Alert.alert('Camera Error', err.message);
              }
            } : handleTakePhoto}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Capture photo and analyze meal"
            accessibilityHint="Takes a picture of your food plate for instant AI nutrient analysis"
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.diagBtn}
            onPress={handleLaunchSystemCamera}
            accessibilityRole="button"
            accessibilityLabel="Open system camera app"
          >
            <Ionicons name="camera" size={20} color={colors.sageBright} />
            <Text style={styles.diagBtnText}>System</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.diagBtn}
            onPress={handlePickFromGallery}
            accessibilityRole="button"
            accessibilityLabel="Choose food photos from device gallery"
          >
            <Ionicons name="images" size={20} color="#FFFFFF" />
            <Text style={styles.diagBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cameraView: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121214',
    padding: 20,
  },
  text: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  btn: {
    marginTop: 16,
    backgroundColor: colors.sageBright,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  btnText: {
    color: '#121214',
    fontWeight: '700',
  },
  topPeriodBadge: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 20, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.4)',
    zIndex: 10,
  },
  topPeriodText: {
    ...typography.micro,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  noteSection: {
    marginBottom: 8,
  },
  noteToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(18, 18, 20, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  noteToggleText: {
    flex: 1,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginHorizontal: 8,
  },
  noteInputCard: {
    backgroundColor: 'rgba(24, 24, 28, 0.95)',
    borderRadius: radius.md,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  chipsScroll: {
    paddingBottom: 8,
  },
  portionChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  portionChipActive: {
    backgroundColor: colors.sageBright,
    borderColor: colors.sageBright,
  },
  portionChipText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  portionChipTextActive: {
    color: '#121214',
    fontWeight: '700',
  },
  noteTextInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    color: '#FFFFFF',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  multiPhotoTray: {
    backgroundColor: 'rgba(18, 18, 20, 0.92)',
    borderRadius: radius.lg,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.3)',
  },
  trayScroll: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  thumbWrapper: {
    position: 'relative',
    marginRight: 10,
    alignItems: 'center',
  },
  thumbImage: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.sageBright,
  },
  thumbDeleteBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 3,
  },
  addMorePhotoBtn: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  addMorePhotoText: {
    fontSize: 9,
    color: colors.sageBright,
    marginTop: 2,
    fontWeight: '600',
  },
  analyzeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sageBright,
    borderRadius: radius.md,
    paddingVertical: 10,
    marginTop: 4,
  },
  analyzeAllBtnText: {
    color: '#121214',
    fontSize: 13,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(18, 18, 20, 0.88)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  diagBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    minWidth: 48,
  },
  diagBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  shutterBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.sageBright,
  },
});

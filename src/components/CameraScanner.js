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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, typography } from '../theme/colors';
import { getCurrentMealPeriod } from '../services/geminiService';

const PORTION_CHIPS = [
  { label: '🍽️ Ate 100% (Full Plate)', value: 'Ate full plate (100%)' },
  { label: '🥣 Ate 50% (Half)', value: 'Ate half portion (50%)' },
  { label: '🥗 Ate 33% (Small)', value: 'Ate 33% of the portion' },
  { label: '🫒 Light Oil / Olive Oil', value: 'Cooked with light olive oil' },
  { label: '🧈 Desi Ghee / Butter', value: 'Cooked in desi ghee' },
  { label: '☕ No Sugar / Sugar-Free', value: 'Beverage prepared without sugar' },
  { label: '🧂 Low Salt / Sodium', value: 'Low sodium / less salt' },
  { label: '🍗 Extra Meat / Protein', value: 'Extra portion of chicken / meat' },
];

export default function CameraScanner({ onCapturePhoto, isProcessing = false }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [photos, setPhotos] = useState([]);
  const [userNote, setUserNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [mealPeriod, setMealPeriod] = useState(getCurrentMealPeriod());
  const cameraRef = useRef(null);
  const isCapturingRef = useRef(false);

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

  // Direct single-photo snap & instant AI analysis (Default first shutter tap)
  const handleDirectSnapAndAnalyze = async () => {
    if (!cameraRef.current || isProcessing || isCapturingRef.current) return;
    isCapturingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const t0 = Date.now();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      });
      const captureMs = Date.now() - t0;
      console.log(`[Perf] 📸 Hardware camera capture: ${captureMs}ms`);

      if (!photo?.uri) {
        Alert.alert('Camera Error', 'Could not capture photo from camera sensor.');
        return;
      }

      const optimized = await optimizeImageForAI(photo.uri);
      if (!optimized?.base64) {
        Alert.alert('Optimization Error', 'Could not process photo for AI. Please try again.');
        return;
      }

      onCapturePhoto({
        uri: optimized.uri,
        base64: optimized.base64,
        mimeType: optimized.mimeType || 'image/jpeg',
        photos: [optimized],
        userNote: userNote.trim(),
        mealPeriod,
      });
    } catch (err) {
      console.error('Direct capture error:', err);
      Alert.alert('Camera Error', err?.message || 'Could not capture photo.');
    } finally {
      isCapturingRef.current = false;
    }
  };

  // Multi-angle photo capture (adds photo to tray, up to 4 photos)
  const handleTakePhoto = async () => {
    if (!cameraRef.current || isProcessing || isCapturingRef.current || photos.length >= 4) return;
    isCapturingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const t0 = Date.now();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      });
      const captureMs = Date.now() - t0;
      console.log(`[Perf] 📸 Hardware camera capture: ${captureMs}ms`);

      if (photo?.uri) {
        const optimized = await optimizeImageForAI(photo.uri);
        if (optimized?.base64) {
          setPhotos((prev) => [...prev, optimized].slice(0, 4));
        } else {
          Alert.alert('Optimization Error', 'Could not process photo for AI.');
        }
      }
    } catch (err) {
      console.error('Failed to take picture:', err);
      Alert.alert('Camera Error', 'Could not take photo: ' + err.message);
    } finally {
      isCapturingRef.current = false;
    }
  };

  // 2. Native System Camera App
  const handleLaunchSystemCamera = async () => {
    if (photos.length >= 4 || isProcessing || isCapturingRef.current) return;
    isCapturingRef.current = true;
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const optimized = await optimizeImageForAI(asset.uri);
        if (optimized?.base64) {
          setPhotos((prev) => [...prev, optimized].slice(0, 4));
        } else {
          Alert.alert('Optimization Error', 'Could not process system camera photo.');
        }
      }
    } catch (err) {
      console.error('System camera error:', err);
      Alert.alert('Camera Error', 'Could not launch system camera.');
    } finally {
      isCapturingRef.current = false;
    }
  };

  // 3. Multi-Image Gallery Picker (sequential processing to prevent memory spikes)
  const handlePickFromGallery = async () => {
    if (photos.length >= 4 || isProcessing || isCapturingRef.current) return;
    isCapturingRef.current = true;
    try {
      const remainingSlots = 4 - photos.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const toAdd = result.assets.slice(0, remainingSlots);
        const newItems = [];
        for (const asset of toAdd) {
          const opt = await optimizeImageForAI(asset.uri);
          if (opt?.base64) {
            newItems.push(opt);
          }
        }

        if (newItems.length === 0) {
          Alert.alert('Gallery Error', 'Could not process selected image(s).');
        } else {
          setPhotos((prev) => [...prev, ...newItems].slice(0, 4));
        }
      }
    } catch (err) {
      console.error('Gallery error:', err);
      Alert.alert('Gallery Error', 'Failed to pick image from gallery.');
    } finally {
      isCapturingRef.current = false;
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
    setUserNote((prev) => {
      const parts = prev
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.includes(chipValue)) {
        return parts.filter((p) => p !== chipValue).join(', ');
      } else {
        return [...parts, chipValue].join(', ');
      }
    });
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

      {/* 2. Top Meal Period & Time Context Pill (cleanly positioned below top tabs) */}
      <View style={[styles.topPeriodBadge, { top: insets.top + 54 }]}>
        <Ionicons
          name={mealPeriod.mealType === 'breakfast' ? 'sunny' : mealPeriod.mealType === 'dinner' ? 'moon' : 'restaurant'}
          size={12}
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
        {/* Floating Note / Context Capsule Pill */}
        <View style={styles.noteCapsuleWrapper}>
          {userNote ? (
            <View style={styles.activeNoteCapsule}>
              <TouchableOpacity
                style={styles.activeNoteTouchArea}
                onPress={() => setShowNoteInput(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Meal context note: ${userNote}. Tap to edit.`}
              >
                <View style={styles.activeDot} />
                <Text style={styles.activeNoteText} numberOfLines={1}>
                  "{userNote}"
                </Text>
                <Ionicons name="pencil" size={11} color={colors.sageBright} style={{ marginLeft: 5 }} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearNoteBtn}
                onPress={() => {
                  setUserNote('');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Clear meal context note"
              >
                <Ionicons name="close-circle" size={16} color="rgba(255, 255, 255, 0.65)" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptyNoteCapsule}
              onPress={() => setShowNoteInput(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Add portion context or notes"
            >
              <Ionicons name="create-outline" size={13} color={colors.sageBright} />
              <Text style={styles.emptyNoteText}>+ Add Portion / Note (e.g. "half plate", "light oil")</Text>
            </TouchableOpacity>
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
            onPress={photos.length === 0 ? handleDirectSnapAndAnalyze : handleTakePhoto}
            disabled={isProcessing}
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

      {/* Sleek Frosted Meal Context & Portion Modal */}
      <Modal
        visible={showNoteInput}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNoteInput(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowNoteInput(false)}
          />
          <View style={styles.noteSheetCard}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="restaurant-outline" size={18} color={colors.sageBright} />
                <Text style={styles.sheetTitle}>Meal Context & Portion</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowNoteInput(false)}
                style={styles.sheetCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close context drawer"
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetSubtitle}>
              Help Gemini AI accurately calculate portions, cooking oils, and calories
            </Text>

            {/* Quick Context & Portion Chips */}
            <Text style={styles.chipsSectionTitle}>QUICK CHIPS</Text>
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
                    activeOpacity={0.7}
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

            {/* Custom Description Input */}
            <Text style={styles.chipsSectionTitle}>CUSTOM DETAIL</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.noteTextInput}
                placeholder="e.g. 2 rotis with 1 bowl chicken curry, didn't drink gravy"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={userNote}
                onChangeText={setUserNote}
                multiline={true}
                numberOfLines={2}
                accessibilityLabel="Custom meal description or notes"
              />
              {userNote.length > 0 && (
                <TouchableOpacity
                  onPress={() => setUserNote('')}
                  style={styles.inputClearBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear custom note text"
                >
                  <Ionicons name="close-circle" size={18} color="rgba(255, 255, 255, 0.4)" />
                </TouchableOpacity>
              )}
            </View>

            {/* Apply Button */}
            <TouchableOpacity
              style={styles.applyNoteBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setShowNoteInput(false);
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Apply context to meal"
            >
              <Ionicons name="checkmark-circle" size={18} color="#08170E" />
              <Text style={styles.applyNoteBtnText}>Apply Context</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 22, 28, 0.78)',
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.35)',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  topPeriodText: {
    ...typography.micro,
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: '600',
    marginLeft: 5,
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
  noteCapsuleWrapper: {
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyNoteCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 22, 28, 0.82)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  emptyNoteText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    marginLeft: 6,
  },
  activeNoteCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 26, 22, 0.92)',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.55)',
    maxWidth: '92%',
    shadowColor: colors.sageBright,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  activeNoteTouchArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.sageBright,
    marginRight: 6,
  },
  activeNoteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  clearNoteBtn: {
    padding: 3,
    marginLeft: 6,
  },
  // Modal Sheet Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  noteSheetCard: {
    backgroundColor: 'rgba(22, 24, 30, 0.98)',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 6,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 17,
  },
  chipsSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chipsScroll: {
    paddingBottom: 14,
  },
  portionChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  portionChipActive: {
    backgroundColor: 'rgba(107, 155, 125, 0.25)',
    borderColor: colors.sageBright,
  },
  portionChipText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.78)',
    fontWeight: '500',
  },
  portionChipTextActive: {
    color: colors.sageBright,
    fontWeight: '700',
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 18,
  },
  noteTextInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    color: '#FFFFFF',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    paddingRight: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minHeight: 54,
    textAlignVertical: 'top',
  },
  inputClearBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 2,
  },
  applyNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sageBright,
    paddingVertical: 12,
    borderRadius: radius.lg,
    shadowColor: colors.sageBright,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  applyNoteBtnText: {
    color: '#08170E',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
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

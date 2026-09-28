// src/components/NutritionLabelScanner.js
// Live Fullscreen Camera Viewfinder for Nutrition Facts OCR with Inset Overlays & Remount

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Button from './Button';
import { colors, radius, typography } from '../theme/colors';

export default function NutritionLabelScanner({ onCaptureLabel, isProcessing = false }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState('back');
  const cameraRef = useRef(null);

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.sageBright} />
        <Text style={styles.loadingText}>Initializing camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionWrapper, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }]}>
        <View style={styles.permissionCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="document-text" size={36} color={colors.sageBright} />
          </View>
          <Text style={styles.permTitle}>Camera Access Required</Text>
          <Text style={styles.permSubtitle}>
            Grant camera access to scan Nutrition Facts tables directly from food packages.
          </Text>
          <Button
            title="Enable Camera"
            onPress={requestPermission}
            size="lg"
            style={styles.permBtn}
          />
          <TouchableOpacity
            style={styles.galleryFallbackBtn}
            onPress={() => handlePickFromGallery()}
          >
            <Ionicons name="images-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.galleryFallbackText}>Or choose label photo from gallery</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: true,
      });

      if (photo?.uri && photo?.base64) {
        onCaptureLabel({
          uri: photo.uri,
          base64: photo.base64,
          mimeType: 'image/jpeg',
        });
      }
    } catch (err) {
      console.error('Failed to capture label:', err);
    }
  };

  const handlePickFromGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        onCaptureLabel({
          uri: asset.uri,
          base64: asset.base64,
          mimeType: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      console.error('Failed to pick label image:', err);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Live Native Camera Feed */}
      {permission.granted && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          enableTorch={torch}
        />
      )}

      {/* 2. Sibling Inset-Driven Overlay */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {/* Top Control Bar: positioned below the status bar & top tab pills */}
        <View
          style={[
            styles.topControlsRow,
            { top: insets.top + 54 },
          ]}
        >
          <TouchableOpacity
            style={[styles.circleControlBtn, torch && styles.torchActiveBtn]}
            onPress={() => setTorch(!torch)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={torch ? 'flash' : 'flash-off'}
              size={20}
              color={torch ? '#FFD166' : '#FFFFFF'}
            />
          </TouchableOpacity>

          <View style={styles.tipsBadge}>
            <Ionicons name="document-text-outline" size={13} color={colors.sageBright} />
            <Text style={styles.tipsText}>Align Nutrition Facts table</Text>
          </View>

          <TouchableOpacity
            style={styles.circleControlBtn}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-reverse-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Center Vertical Viewfinder Reticle */}
        <View style={styles.centerReticleLayer} pointerEvents="none">
          <View style={styles.labelFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            <View style={styles.frameHelper}>
              <Ionicons name="scan" size={13} color={colors.sageBright} />
              <Text style={styles.frameHelperText}>Nutrition Facts</Text>
            </View>
          </View>
        </View>

        {/* Bottom Controls Row: clears floating tab bar */}
        <View
          style={[
            styles.bottomControlsRow,
            { bottom: insets.bottom + 96 },
          ]}
        >
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handlePickFromGallery}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <Ionicons name="images-outline" size={24} color="#FFFFFF" />
            <Text style={styles.actionLabel}>Gallery</Text>
          </TouchableOpacity>

          {/* Shutter Button */}
          <TouchableOpacity
            style={[styles.shutterOuter, isProcessing && styles.shutterOuterDisabled]}
            onPress={handleCapture}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <View style={styles.shutterRing}>
              <View style={styles.shutterInner}>
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Ionicons name="scan-outline" size={28} color={colors.textInverse} />
                )}
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.actionBtn}>
            <Ionicons name="document-text" size={20} color={colors.sageBright} />
            <Text style={styles.actionLabel}>OCR AI</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    position: 'relative',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  loadingText: {
    ...typography.bodyMuted,
    marginTop: 12,
  },
  permissionWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  permissionCard: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.sageSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  permTitle: {
    ...typography.title2,
    marginBottom: 8,
    textAlign: 'center',
  },
  permSubtitle: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  permBtn: {
    width: '100%',
  },
  galleryFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  galleryFallbackText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: 6,
  },
  topControlsRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  circleControlBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(18, 18, 20, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchActiveBtn: {
    backgroundColor: 'rgba(255, 209, 102, 0.25)',
    borderColor: '#FFD166',
  },
  tipsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 20, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  tipsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  centerReticleLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  labelFrame: {
    width: 250,
    height: 320,
    position: 'relative',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 16,
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: colors.sageBright,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: radius.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: radius.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: radius.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: radius.md,
  },
  frameHelper: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  frameHelperText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 5,
    letterSpacing: 0.5,
  },
  bottomControlsRow: {
    position: 'absolute',
    left: 32,
    right: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuterDisabled: {
    opacity: 0.6,
  },
  shutterRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.sageBright,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.sageBright,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
});

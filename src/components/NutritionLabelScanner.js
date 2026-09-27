// src/components/NutritionLabelScanner.js
// Specialized fullscreen camera viewfinder for Nutrition Facts label OCR scanning

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Button from './Button';
import { colors, radius, typography } from '../theme/colors';

export default function NutritionLabelScanner({ onCaptureLabel, isProcessing = false }) {
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
      <View style={styles.permissionWrapper}>
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
      {/* Live Camera Feed */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        enableTorch={torch}
        ref={cameraRef}
      />

      {/* Floating UI Overlay */}
      <View style={styles.overlayContainer} pointerEvents="box-none">
        {/* Top Controls */}
        <View style={styles.topBar}>
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
            <Ionicons name="document-text-outline" size={14} color={colors.sageBright} />
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

        {/* Vertical Nutrition Label Viewfinder Frame */}
        <View style={styles.frameContainer} pointerEvents="none">
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

        {/* Bottom Controls */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.galleryBtn}
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

          <View style={styles.aiBadgeWrapper}>
            <View style={styles.aiBadge}>
              <Ionicons name="document-text" size={18} color={colors.sageBright} />
              <Text style={styles.actionLabel}>OCR AI</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 10,
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
    padding: 20,
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  circleControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 18, 20, 0.65)',
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
    backgroundColor: 'rgba(18, 18, 20, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tipsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  frameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelFrame: {
    width: 250,
    height: 330,
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
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    paddingBottom: 90,
  },
  galleryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuterDisabled: {
    opacity: 0.6,
  },
  shutterRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.sageBright,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.sageBright,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  aiBadgeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  aiBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

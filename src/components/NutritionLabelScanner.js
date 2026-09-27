// src/components/NutritionLabelScanner.js
// Specialized camera viewfinder for Nutrition Facts label OCR scanning

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
  const cameraRef = useRef(null);

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.sageBright} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="document-text-outline" size={36} color={colors.sageBright} />
        </View>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permSubtitle}>
          Grant camera access to scan Nutrition Facts tables from food packaging.
        </Text>
        <Button
          title="Enable Camera"
          onPress={requestPermission}
          style={styles.permBtn}
        />
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
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torch}
        ref={cameraRef}
      >
        {/* Top Controls */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.torchBtn}
            onPress={() => setTorch(!torch)}
          >
            <Ionicons
              name={torch ? 'flash' : 'flash-off'}
              size={20}
              color={torch ? '#FFD166' : colors.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.tipsBadge}>
            <Ionicons name="document-text-outline" size={13} color={colors.sageBright} />
            <Text style={styles.tipsText}>Align Nutrition Facts label</Text>
          </View>
        </View>

        {/* Vertical Nutrition Label Viewfinder Frame */}
        <View style={styles.frameContainer}>
          <View style={styles.labelFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            <View style={styles.frameHelper}>
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
          >
            <Ionicons name="images-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* Shutter Button */}
          <TouchableOpacity
            style={styles.shutterOuter}
            onPress={handleCapture}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <View style={styles.shutterInner}>
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Ionicons name="scan-outline" size={26} color={colors.textInverse} />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.placeholderBtn} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: radius.lg,
    overflow: 'hidden',
    minHeight: 460,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    backgroundColor: colors.sageSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permTitle: {
    ...typography.title2,
    marginBottom: 8,
  },
  permSubtitle: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  permBtn: {
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  torchBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 20, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  tipsText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
    marginLeft: 6,
  },
  frameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelFrame: {
    width: 240,
    height: 320,
    position: 'relative',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 12,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.sageBright,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: radius.sm,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: radius.sm,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: radius.sm,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: radius.sm,
  },
  frameHelper: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  frameHelperText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  galleryBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.sageBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderBtn: {
    width: 48,
  },
});

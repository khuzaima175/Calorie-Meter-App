// src/components/BarcodeScanner.js
// Live Fullscreen Barcode Scanner with Inset Overlays, Laser Target & Manual Entry

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Input from './Input';
import Button from './Button';
import { colors, radius, typography } from '../theme/colors';

export default function BarcodeScanner({ onScanBarcode, isProcessing = false }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);

  // Force remount on mount
  useEffect(() => {
    setCameraKey((k) => k + 1);
  }, []);

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.sageBright} />
        <Text style={styles.loadingText}>Initializing barcode scanner...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionWrapper, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }]}>
        <View style={styles.permissionCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="barcode" size={36} color={colors.sageBright} />
          </View>
          <Text style={styles.permTitle}>Camera Permission Required</Text>
          <Text style={styles.permSubtitle}>
            Grant camera access to scan food barcodes directly and fetch instant nutrition details.
          </Text>
          <Button
            title="Allow Camera"
            onPress={requestPermission}
            size="lg"
            style={styles.permBtn}
          />
        </View>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }) => {
    if (scanned || isProcessing || !data) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onScanBarcode(data);

    // Re-enable scanning after 3 seconds in case user wants to scan again
    setTimeout(() => setScanned(false), 3000);
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onScanBarcode(manualCode.trim());
  };

  return (
    <View style={styles.container}>
      {/* 1. Live Native Camera Feed */}
      {permission.granted && (
        <CameraView
          key={cameraKey}
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
          }}
          onBarcodeScanned={scanned || isProcessing ? undefined : handleBarcodeScanned}
        />
      )}

      {/* 2. Sibling Inset-Driven Overlay */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {/* Top Controls Row */}
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

          <View style={styles.statusBadge}>
            <Ionicons name="scan" size={13} color={colors.sageBright} />
            <Text style={styles.statusText}>
              {isProcessing ? 'Looking up product...' : 'Align barcode inside frame'}
            </Text>
          </View>

          <View style={{ width: 42 }} />
        </View>

        {/* Center Viewfinder Reticle with Laser Line */}
        <View style={styles.centerReticleLayer} pointerEvents="none">
          <View style={styles.targetFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Laser line */}
            <View style={styles.laserLine} />
          </View>
        </View>

        {/* Bottom Manual Entry Drawer / Toggle: clears floating tab bar */}
        <View
          style={[
            styles.bottomControlsRow,
            { bottom: insets.bottom + 96 },
          ]}
        >
          {showManualInput ? (
            <View style={styles.manualBox}>
              <View style={styles.manualHeader}>
                <Text style={styles.manualTitle}>Enter Barcode Number</Text>
                <TouchableOpacity
                  onPress={() => setShowManualInput(false)}
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.manualInputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Input
                    placeholder="e.g. 737628064502"
                    value={manualCode}
                    onChangeText={setManualCode}
                    keyboardType="numeric"
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <Button
                  title="Search"
                  onPress={handleManualSubmit}
                  loading={isProcessing}
                />
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.manualToggleBtn}
              onPress={() => setShowManualInput(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="keypad-outline" size={16} color={colors.textPrimary} />
              <Text style={styles.manualToggleText}>Type barcode manually</Text>
            </TouchableOpacity>
          )}
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 20, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statusText: {
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
  targetFrame: {
    width: 280,
    height: 180,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
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
  laserLine: {
    height: 2.5,
    backgroundColor: colors.sageBright,
    width: '90%',
    shadowColor: colors.sageBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  bottomControlsRow: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  manualToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 20, 0.85)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  manualToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  manualBox: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  manualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  manualTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

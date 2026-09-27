// src/components/BarcodeScanner.js
// Live Barcode Scanner with target overlay and manual barcode lookup fallback

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Input from './Input';
import Button from './Button';
import { colors, radius, typography } from '../theme/colors';

export default function BarcodeScanner({ onScanBarcode, isProcessing = false }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [scanned, setScanned] = useState(false);

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
          <Ionicons name="barcode-outline" size={36} color={colors.sageBright} />
        </View>
        <Text style={styles.permTitle}>Camera Permission Required</Text>
        <Text style={styles.permSubtitle}>
          Grant camera access to scan food barcodes directly.
        </Text>
        <Button
          title="Allow Camera"
          onPress={requestPermission}
          style={styles.permBtn}
        />
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
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
        }}
        onBarcodeScanned={scanned || isProcessing ? undefined : handleBarcodeScanned}
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

          <View style={styles.statusBadge}>
            <Ionicons name="scan" size={13} color={colors.sageBright} />
            <Text style={styles.statusText}>
              {isProcessing ? 'Looking up product...' : 'Align barcode within frame'}
            </Text>
          </View>
        </View>

        {/* Viewfinder Frame */}
        <View style={styles.frameContainer}>
          <View style={styles.targetFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Laser line */}
            <View style={styles.laserLine} />
          </View>
        </View>

        {/* Bottom Manual Entry Drawer / Toggle */}
        <View style={styles.bottomDrawer}>
          {showManualInput ? (
            <View style={styles.manualBox}>
              <View style={styles.manualHeader}>
                <Text style={styles.manualTitle}>Enter Barcode Number</Text>
                <TouchableOpacity onPress={() => setShowManualInput(false)}>
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
            >
              <Ionicons name="keypad-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.manualToggleText}>Type barcode manually</Text>
            </TouchableOpacity>
          )}
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 20, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  statusText: {
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
  targetFrame: {
    width: 280,
    height: 180,
    position: 'relative',
    justifyContent: 'center',
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
  laserLine: {
    height: 2,
    backgroundColor: colors.sageBright,
    width: '100%',
    shadowColor: colors.sageBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  bottomDrawer: {
    padding: 16,
    alignItems: 'center',
  },
  manualToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 20, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
  },
  manualToggleText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  manualBox: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  manualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  manualTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

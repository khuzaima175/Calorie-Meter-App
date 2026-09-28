import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/colors';

export default function CameraScanner({ onCapturePhoto, isProcessing = false }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const cameraRef = useRef(null);

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isProcessing) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo?.uri && photo?.base64) {
        onCapturePhoto({
          uri: photo.uri,
          base64: photo.base64,
          mimeType: 'image/jpeg',
        });
      }
    } catch (err) {
      console.error('Failed to take picture:', err);
      Alert.alert('Error', 'Failed to take photo: ' + err.message);
    }
  };

  // Fallback: System Camera App (Native Intent)
  const handleLaunchSystemCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        onCapturePhoto({
          uri: asset.uri,
          base64: asset.base64,
          mimeType: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      console.error('System camera error:', err);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        onCapturePhoto({
          uri: asset.uri,
          base64: asset.base64,
          mimeType: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      console.error('Gallery error:', err);
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
        <Text style={styles.text}>Camera permission not granted</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Pure Bare CameraView — No overlays, no remount keys, no timers */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        onCameraReady={() => console.log(`[BARE TEST] CAMERA READY (${facing})`)}
        onMountError={(e) => console.log(`[BARE TEST] CAMERA MOUNT ERROR:`, e?.nativeEvent || e)}
      />

      {/* 2. Minimal Diagnostic Bar at bottom */}
      <View style={styles.bottomBar} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.diagBtn}
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
        >
          <Ionicons name="camera-reverse" size={20} color="#FFFFFF" />
          <Text style={styles.diagBtnText}>Flip ({facing})</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shutterBtn} onPress={handleTakePhoto}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.diagBtn} onPress={handleLaunchSystemCamera}>
          <Ionicons name="camera" size={20} color={colors.sageBright} />
          <Text style={styles.diagBtnText}>System App</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.diagBtn} onPress={handlePickFromGallery}>
          <Ionicons name="images" size={20} color="#FFFFFF" />
          <Text style={styles.diagBtnText}>Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  bottomBar: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(18, 18, 20, 0.85)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  diagBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  diagBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  shutterBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.sageBright,
  },
});

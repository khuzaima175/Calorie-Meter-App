// src/components/OfflineBanner.js
// Non-intrusive offline status banner for Web and Mobile

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography } from '../theme/colors';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      setIsOffline(!window.navigator.onLine);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOffline ? 0 : -40,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <Ionicons name="cloud-offline-outline" size={14} color="#FFFFFF" />
      <Text style={styles.bannerText}>
        Offline — Your logs are stored on this device. AI needs internet.
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#C85A32',
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  bannerText: {
    ...typography.micro,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 11,
  },
});

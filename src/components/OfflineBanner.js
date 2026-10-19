import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { isConnected, subscribeConnectivity } from '../services/connectivityService';
export default function OfflineBanner() {
  const [online, setOnline] = useState(isConnected);
  useEffect(() => subscribeConnectivity(setOnline), []);
  if (online) return null;
  return <View style={styles.banner} accessibilityRole="alert"><Ionicons name="cloud-offline-outline" size={15} color="#FFF" /><Text style={styles.text}>Offline · Your diary is available. Scans wait for a connection.</Text></View>;
}
const styles = StyleSheet.create({ banner: { backgroundColor: '#8F462D', flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' }, text: { flex: 1, color: '#FFF', fontSize: 12, lineHeight: 18 } });

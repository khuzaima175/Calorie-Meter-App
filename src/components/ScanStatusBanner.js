import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useScanStore } from '../stores/useScanStore';
import CapturedPhotoPreview from './CapturedPhotoPreview';
import { colors, radius } from '../theme/colors';

export default function ScanStatusBanner({ onOpen }) {
  const jobs = useScanStore((s) => s.jobs);
  const paused = useScanStore((s) => s.isPaused);
  if (!jobs.length) return null;
  const ready = jobs.filter((j) => j.status === 'ready').length;
  const failed = jobs.filter((j) => j.status === 'failed').length;
  const featured = jobs.find((j) => j.status === 'ready') || jobs.find((j) => j.status === 'analyzing') || jobs[0];
  const title = ready ? `${ready} meal${ready === 1 ? '' : 's'} ready to review` : failed === jobs.length ? 'Your scan needs attention' : paused ? 'Scans waiting for connection' : 'Your meal is being analyzed';
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${title}. Open scans.`} onPress={() => onOpen(featured.id)} style={styles.banner} activeOpacity={0.8}>
    <CapturedPhotoPreview compact uri={featured.thumbnailUri || featured.photos[0]?.uri} style={styles.photo} />
    <View style={styles.copy}><Text style={styles.title} accessibilityLiveRegion="polite">{title}</Text><Text style={styles.subtitle}>Keep going · Tap to view your scans</Text></View>
    <Ionicons name="chevron-forward" size={18} color={colors.sageBright} />
  </TouchableOpacity>;
}
const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginHorizontal: 14, marginBottom: 12, borderRadius: radius.md, backgroundColor: colors.cardElevated, borderWidth: 1, borderColor: colors.sageDark },
  photo: { width: 42, height: 42, borderRadius: 10 }, copy: { flex: 1 },
  title: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 }, subtitle: { color: colors.textSecondary, fontSize: 11, marginTop: 3 },
});

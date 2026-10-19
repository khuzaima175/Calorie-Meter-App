import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { resolveImageUriAsync } from '../services/imageService';
import { colors, radius } from '../theme/colors';

export default function CapturedPhotoPreview({ uri, style, label = 'Captured meal photo', compact = false }) {
  const [displayed, setDisplayed] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const sequence = useRef(0), started = useRef(Date.now());
  useEffect(() => {
    const request = ++sequence.current;
    let objectUrl;
    started.current = Date.now();
    setFailed(false); setCandidate(null);
    if (!uri) { setDisplayed(null); return; }
    resolveImageUriAsync(uri).then((resolved) => {
      if (uri.startsWith('indexeddb://') && resolved?.startsWith('blob:')) objectUrl = resolved;
      if (request !== sequence.current) { if (objectUrl) URL.revokeObjectURL(objectUrl); return; }
      if (resolved) setCandidate({ uri: resolved, request });
      else setFailed(true);
    }).catch(() => { if (request === sequence.current) setFailed(true); });
    return () => { sequence.current++; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [uri, attempt]);
  return <View style={[styles.frame, style]}>
    {displayed && <Image source={{ uri: displayed }} style={styles.fill} resizeMode="cover" accessibilityLabel={label} onError={() => { setDisplayed(null); setFailed(true); }} />}
    {candidate && <Image key={candidate.request} source={{ uri: candidate.uri }} resizeMode="cover" accessibilityLabel={label}
      style={[styles.fill, displayed && { opacity: 0 }]} onLoad={() => {
        if (candidate.request !== sequence.current) return;
        setDisplayed(candidate.uri); setCandidate(null); setFailed(false);
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.info('[Scan timing]', { previewLoadMs: Date.now() - started.current });
      }} onError={() => { if (candidate.request === sequence.current) { setCandidate(null); setFailed(true); } }} />}
    {!displayed && !candidate && <View style={styles.placeholder}>
      <Ionicons name={failed ? 'image-outline' : 'restaurant-outline'} size={compact ? 20 : 34} color={colors.textSecondary} />
      {!compact && <Text style={styles.message}>{failed ? 'Photo preview unavailable' : uri ? 'Loading your photo…' : 'Meal scan'}</Text>}
      {failed && !compact && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry loading photo" onPress={() => setAttempt((n) => n + 1)} style={styles.retry}><Text style={styles.retryText}>Reload photo</Text></TouchableOpacity>}
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  frame: { width: '100%', height: 220, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.cardElevated },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 },
  message: { color: colors.textSecondary, fontSize: 13, marginTop: 8 },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  retryText: { color: colors.sageBright, fontWeight: '600' },
});

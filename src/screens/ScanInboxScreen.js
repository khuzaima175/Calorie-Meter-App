import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useScanStore } from '../stores/useScanStore';
import { useNutritionStore } from '../stores/useNutritionStore';
import { scanManager } from '../services/scanService';
import CapturedPhotoPreview from '../components/CapturedPhotoPreview';
import FoodAnalysisResult from '../components/FoodAnalysisResult';
import Button from '../components/Button';
import Input from '../components/Input';
import { colors, radius, typography } from '../theme/colors';

export default function ScanInboxScreen({ navigation, focusId }) {
  const jobs = useScanStore((s) => s.jobs);
  const paused = useScanStore((s) => s.isPaused);
  const [selected, setSelected] = useState(focusId || null);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [savedDate, setSavedDate] = useState(null);
  const job = jobs.find((j) => j.id === selected);
  const run = async (operation) => { setError(''); try { await operation(); } catch (e) { setError(e.message || 'Please try again.'); } };
  const discard = () => run(async () => { await scanManager.discard(job.id); setSelected(null); });
  const save = (meal) => run(async () => {
    const date = job.date;
    await scanManager.save(job.id, meal);
    useNutritionStore.getState().invalidateSummary();
    await useNutritionStore.getState().refreshData();
    setSavedDate(date); setSelected(null);
  });
  const showReview = job && ['ready','saving'].includes(job.status);
  return <SafeAreaView style={styles.screen} edges={['top','left','right']}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={job ? 'Back to scans' : 'Back to dashboard'} style={styles.back} onPress={() => { setError(''); setSelected(null); if (!job) navigation.navigate('Dashboard'); }}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
      <View style={{ flex: 1 }}><Text style={styles.title}>{showReview ? 'Review your meal' : 'Your scans'}</Text><Text style={styles.subtitle}>{job ? `Diary date · ${job.date}` : 'Photos saved. Review whenever you are ready.'}</Text></View>
    </View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {savedDate && !job ? <View style={styles.notice}><Text style={styles.noticeText}>Saved to {savedDate}</Text><Button size="sm" title="View diary" onPress={() => run(async () => { await useNutritionStore.getState().setSelectedDate(savedDate); navigation.navigate('Dashboard'); })} /></View> : null}
    {showReview ? <FoodAnalysisResult key={job.id} analysis={{ ...job.result, ...job.draft }} imageUri={job.photos[0]?.uri || job.result?.image_uri} imageUris={job.photos.map((p) => p.uri)}
      isSaving={job.status === 'saving'} onSave={save} onDraftChange={(draft) => { void scanManager.setDraft(job.id, draft).catch((e) => setError(e.message)); }}
      onCancel={() => setSelected(null)} cancelLabel="Back to scans" /> : <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {job ? <>
        <CapturedPhotoPreview key={job.id} uri={job.photos[0]?.uri} />
        <View style={styles.statusCard}>
          {['preparing','queued','analyzing'].includes(job.status) && <ActivityIndicator color={colors.sageBright} style={{ marginBottom: 14 }} />}
          <Text style={styles.statusTitle} accessibilityLiveRegion="polite">{job.status === 'failed' ? 'Let’s try that again' : paused && job.status === 'queued' ? 'Waiting for connection' : job.stage}</Text>
          <Text style={styles.body}>{job.error || 'You can use the rest of the app. Your result will be here when it is ready.'}</Text>
          <Button title="Continue using app" onPress={() => navigation.navigate('Dashboard')} fullWidth style={{ marginTop: 18 }} />
          {job.status === 'failed' && <>
            <Button title="Retry scan" variant="outline" fullWidth onPress={() => run(() => scanManager.retry(job.id))} style={{ marginTop: 12 }} />
            <Input label="Or describe your meal" placeholder="e.g. 2 rotis and a bowl of daal" value={description} onChangeText={setDescription} multiline containerStyle={{ marginTop: 20 }} />
            <Button title="Analyze description" disabled={!description.trim()} onPress={() => run(() => scanManager.describe(job.id, description.trim()))} variant="secondary" />
          </>}
          <Button title={job.status === 'failed' ? 'Discard scan' : 'Cancel scan'} variant="ghost" onPress={discard} fullWidth style={{ marginTop: 10 }} />
        </View>
      </> : <>
        {!jobs.length && <View style={styles.empty}><Ionicons name="checkmark-circle-outline" size={42} color={colors.sageBright} /><Text style={styles.statusTitle}>All caught up</Text><Text style={styles.body}>Snap a meal and keep moving. Your scans will appear here.</Text></View>}
        {[...jobs].reverse().map((item) => <TouchableOpacity key={item.id} style={styles.row} accessibilityRole="button" accessibilityLabel={`${item.result?.name || 'Meal scan'}, ${item.stage}, ${item.date}`} onPress={() => { setSelected(item.id); setDescription(''); setError(''); }}>
          <CapturedPhotoPreview compact uri={item.thumbnailUri || item.photos[0]?.uri} style={styles.thumb} />
          <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{item.result?.name || (item.kind === 'text' ? item.text : 'Meal scan')}</Text><Text style={styles.subtitle}>{item.date} · {item.status === 'ready' ? 'Ready to review' : item.status === 'failed' ? 'Needs attention' : item.stage}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.sageBright} />
        </TouchableOpacity>)}
        <Button title="Scan another meal" onPress={() => navigation.navigate('LogMeal')} fullWidth style={{ marginTop: 12 }} />
        <Button title="Continue using app" variant="ghost" onPress={() => navigation.navigate('Dashboard')} fullWidth />
      </>}
    </ScrollView>}
    {showReview && <View style={styles.footer}>
      <Button title="Continue using app" variant="ghost" onPress={() => navigation.navigate('Dashboard')} disabled={job.status === 'saving'} />
      <Button title="Discard scan" variant="ghost" onPress={discard} disabled={job.status === 'saving'} />
    </View>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18 },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cardBackground, borderRadius: 14 },
  title: { ...typography.title2 }, subtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 3 },
  content: { padding: 18, paddingBottom: 36 }, statusCard: { padding: 20, marginTop: 18, backgroundColor: colors.cardBackground, borderRadius: radius.lg },
  statusTitle: { ...typography.title3, marginTop: 10, textAlign: 'center' }, body: { ...typography.bodyMuted, textAlign: 'center', marginTop: 8 },
  error: { color: colors.error, padding: 16 }, notice: { padding: 16, marginHorizontal: 18, backgroundColor: colors.sageSubtle, borderRadius: radius.md, gap: 10 },
  noticeText: { color: colors.sageBright, fontWeight: '600' }, empty: { alignItems: 'center', paddingVertical: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 12, borderRadius: radius.md, backgroundColor: colors.cardBackground },
  thumb: { width: 58, height: 58 }, rowTitle: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 }, footer: { padding: 6 },
});

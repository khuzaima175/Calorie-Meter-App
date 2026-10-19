import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Alert } from '../services/alertService';
import { useNutritionStore } from '../stores/useNutritionStore';
import { scanManager } from '../services/scanService';
import { parseMealDescription } from '../services/geminiService';
import CameraScanner from '../components/CameraScanner';
import NutritionLabelScanner from '../components/NutritionLabelScanner';
import BarcodeScanner from '../components/BarcodeScanner';
import CapturedPhotoPreview from '../components/CapturedPhotoPreview';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { colors, radius, typography } from '../theme/colors';

const TABS = [{ key: 'photo', label: 'Photo', icon: 'camera-outline' }, { key: 'text', label: 'Text', icon: 'text-outline' }, { key: 'label', label: 'Label', icon: 'document-text-outline' }, { key: 'barcode', label: 'Barcode', icon: 'barcode-outline' }, { key: 'manual', label: 'Manual', icon: 'create-outline' }];
const MEALS = ['breakfast','lunch','dinner','snack'];
export default function LogMealScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const addMeal = useNutritionStore((s) => s.addMeal);
  const [activeTab, setActiveTab] = useState(route?.params?.mode || 'photo');
  const [captureUri, setCaptureUri] = useState(null);
  const [textDescription, setTextDescription] = useState(route?.params?.text || '');
  const [manualName, setManualName] = useState('');
  const [manualMealType, setManualMealType] = useState('lunch');
  const [manualPortion, setManualPortion] = useState('1 serving');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEstimatingManual, setIsEstimatingManual] = useState(false);
  const mounted = useRef(true), saveLock = useRef(false), barcodeReqIdRef = useRef(0), pendingCaptureId = useRef(null), captureDate = useRef(null), manualController = useRef(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; barcodeReqIdRef.current++; manualController.current?.abort(); }; }, []);
  const handleTabChange = (key) => { if (!isSaving && !isEstimatingManual) { barcodeReqIdRef.current++; setActiveTab(key); setCaptureUri(null); } };
  const handleCaptureStart = (uri) => { pendingCaptureId.current = ++barcodeReqIdRef.current; captureDate.current = useNutritionStore.getState().selectedDate; setCaptureUri(uri); };
  const cancelCapture = () => { barcodeReqIdRef.current++; setCaptureUri(null); };
  const enqueue = (input) => {
    try {
      const id = scanManager.enqueue({ ...input, date: captureDate.current || route?.params?.date || useNutritionStore.getState().selectedDate });
      if (mounted.current) navigation.navigate('Scans', { jobId: id });
    } catch (error) {
      if (mounted.current) { setCaptureUri(null); Alert.alert('Could not start scan', error.message, [{ text: 'Close', style: 'cancel' }, { text: 'View scans', onPress: () => navigation.navigate('Scans') }]); }
    }
  };
  const handoff = (payload, kind = 'photo') => {
    if (pendingCaptureId.current !== null && pendingCaptureId.current !== barcodeReqIdRef.current) return;
    pendingCaptureId.current = null;
    enqueue({ kind, photos: payload.photos?.length ? payload.photos : [{ uri: payload.uri }], context: { userNote: payload.userNote || '', mealPeriod: payload.mealPeriod } });
  };
  const handleEstimateManual = async () => {
    if (isSaving || isEstimatingManual) return;
    const query = manualName.trim();
    if (!query) {
      Alert.alert('Missing Name', 'Please type a food or meal name first.');
      return;
    }
    const request = ++barcodeReqIdRef.current;
    manualController.current?.abort(); manualController.current = new AbortController();
    setIsEstimatingManual(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const fullQuery = manualPortion.trim() && manualPortion.trim() !== '1 serving'
        ? `${query} (${manualPortion.trim()})`
        : query;
      const result = await parseMealDescription(fullQuery, {
        signal: manualController.current.signal,
        mealPeriod: { mealType: manualMealType, label: manualMealType, timeStr: '' },
      });
      if (request !== barcodeReqIdRef.current) return;
      if (result) {
        if (result.calories != null) setManualCalories(String(Math.round(result.calories)));
        if (result.protein != null) setManualProtein(String(Math.round(result.protein)));
        if (result.carbs != null) setManualCarbs(String(Math.round(result.carbs)));
        if (result.fat != null) setManualFat(String(Math.round(result.fat)));
        if (result.portion && (!manualPortion || manualPortion === '1 serving')) {
          setManualPortion(result.portion);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (err) {
      if (request !== barcodeReqIdRef.current) return;
      Alert.alert('Estimation Failed', err?.message || 'Could not auto-calculate. Please enter calories manually.');
    } finally {
      if (request === barcodeReqIdRef.current) setIsEstimatingManual(false);
    }
  };

  const handleSaveManual = async () => {
    if (saveLock.current || isSaving || isEstimatingManual) return;

    if (!manualName.trim()) {
      Alert.alert('Missing Name', 'Please enter a food or meal name.');
      return;
    }

    let calNum = Number(manualCalories);
    let protNum = Number(manualProtein);
    let carbsNum = Number(manualCarbs);
    let fatNum = Number(manualFat);
    let finalPortion = manualPortion.trim() || '1 serving';

    const targetDate = route?.params?.date || useNutritionStore.getState().selectedDate;
    manualController.current?.abort(); manualController.current = new AbortController();
    saveLock.current = true;
    setIsSaving(true);

    // If calories not entered, auto-calculate with Gemini AI on the fly
    if (manualCalories.trim() === '') {
      try {
        const fullQuery = finalPortion && finalPortion !== '1 serving'
          ? `${manualName.trim()} (${finalPortion})`
          : manualName.trim();
        const aiResult = await parseMealDescription(fullQuery, {
          signal: manualController.current.signal,
          mealPeriod: { mealType: manualMealType, label: manualMealType, timeStr: '' },
        });
        if (!mounted.current) { saveLock.current = false; return; }
        if (aiResult && Number.isFinite(aiResult.calories) && aiResult.calories >= 0) {
          calNum = Math.round(aiResult.calories);
          protNum = Math.round(aiResult.protein || 0);
          carbsNum = Math.round(aiResult.carbs || 0);
          fatNum = Math.round(aiResult.fat || 0);
          if (aiResult.portion) finalPortion = aiResult.portion;
        } else {
          Alert.alert('Could Not Estimate', 'Please enter calories manually.');
          saveLock.current = false;
          if (mounted.current) setIsSaving(false);
          return;
        }
      } catch (aiErr) {
        if (!mounted.current) { saveLock.current = false; return; }
        Alert.alert('Estimation Failed', aiErr?.message || 'Could not auto-calculate calories.');
        saveLock.current = false;
        if (mounted.current) setIsSaving(false);
        return;
      }
    }

    if (!Number.isFinite(calNum) || calNum < 0 || calNum > 10000) {
      Alert.alert('Invalid Calories', 'Please enter realistic calories between 0 and 10,000.');
      saveLock.current = false;
      if (mounted.current) setIsSaving(false);
      return;
    }
    if (![protNum, carbsNum, fatNum].every(Number.isFinite) || protNum < 0 || protNum > 1000 || carbsNum < 0 || carbsNum > 1000 || fatNum < 0 || fatNum > 1000) {
      Alert.alert('Invalid Macros', 'Macronutrient values must be realistic positive numbers.');
      saveLock.current = false;
      if (mounted.current) setIsSaving(false);
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      await addMeal({
        date: targetDate,
        name: manualName.trim(),
        meal_type: manualMealType,
        portion: finalPortion,
        calories: calNum,
        protein: protNum,
        carbs: carbsNum,
        fat: fatNum,
      });

      if (mounted.current) {
        setManualName('');
        setManualPortion('1 serving');
        setManualCalories('');
        setManualProtein('');
        setManualCarbs('');
        setManualFat('');
        navigation.navigate('Dashboard');
      }
    } catch (err) {
      if (mounted.current) Alert.alert('Save Failed', err.message || 'Could not save meal.');
    } finally {
      saveLock.current = false;
      if (mounted.current) setIsSaving(false);
    }
  };

  const cameraMode = ['photo','label','barcode'].includes(activeTab);
  const disabled = isSaving || isEstimatingManual;
  const tabs = <View style={styles.tabs}>{TABS.map((tab) => <TouchableOpacity key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: activeTab === tab.key, disabled }} disabled={disabled} style={[styles.tab, activeTab === tab.key && styles.selectedTab]} onPress={() => handleTabChange(tab.key)}><Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? colors.textInverse : colors.textSecondary} /><Text style={[styles.tabText, activeTab === tab.key && { color: colors.textInverse }]}>{tab.label}</Text></TouchableOpacity>)}</View>;
  if (captureUri) return <SafeAreaView style={styles.screen}><View style={styles.form}><Text style={styles.title}>Your captured meal</Text><CapturedPhotoPreview uri={captureUri} /><Text style={styles.subtitle}>Saving your photo… You can continue using the app.</Text><Button title="Cancel & Retake" accessibilityLabel="Cancel analysis" onPress={cancelCapture} /></View></SafeAreaView>;
  if (cameraMode) return <View style={styles.camera}>
    {activeTab === 'photo' && <CameraScanner onCaptureStart={handleCaptureStart} onCaptureAbort={cancelCapture} onCapturePhoto={(payload) => handoff(payload)} />}
    {activeTab === 'label' && <NutritionLabelScanner onCaptureStart={handleCaptureStart} onCaptureAbort={cancelCapture} onCaptureLabel={(payload) => handoff(payload, 'label')} />}
    {activeTab === 'barcode' && <BarcodeScanner onScanBarcode={(text) => { captureDate.current = useNutritionStore.getState().selectedDate; enqueue({ kind: 'barcode', text }); }} />}
    <View style={[styles.cameraHeader, { top: insets.top + 8 }]}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close camera" style={styles.close} onPress={() => navigation.navigate('Dashboard')}><Ionicons name="close" size={22} color={colors.textPrimary} /></TouchableOpacity>{tabs}</View>
  </View>;
  return <SafeAreaView style={styles.screen} edges={['top','left','right']}>
    <View style={styles.heading}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close meal logger" style={styles.close} onPress={() => navigation.navigate('Dashboard')}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity><View><Text style={styles.title}>Log your meal</Text><Text style={styles.subtitle}>A little detail makes a better estimate.</Text></View></View>
    <View style={{ paddingHorizontal: 16 }}>{tabs}</View>
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      {activeTab === 'text' ? <Card><Text style={styles.cardTitle}>Describe your meal</Text><Text style={styles.subtitle}>Foods, quantities, and cooking details—English or Roman Urdu.</Text>
        <Input label="What did you eat?" value={textDescription} onChangeText={setTextDescription} placeholder="e.g. 2 rotis with daal and a small bowl of raita" multiline numberOfLines={4} containerStyle={{ marginTop: 20 }} />
        <Button title="Analyze meal" disabled={!textDescription.trim()} onPress={() => { captureDate.current = null; enqueue({ kind: 'text', text: textDescription.trim() }); }} fullWidth />
        <Text style={styles.hint}>Your estimate will appear in Scans. Keep using the app while it processes.</Text>
      </Card> : <Card><Text style={styles.cardTitle}>Meal details</Text><View style={styles.mealTypes}>{MEALS.map((type) => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: manualMealType === type }} key={type} disabled={disabled} style={[styles.mealType, manualMealType === type && styles.activeMeal]} onPress={() => setManualMealType(type)}><Text style={styles.typeText}>{type[0].toUpperCase() + type.slice(1)}</Text></TouchableOpacity>)}</View>
        <Input label="Food / Meal Name *" value={manualName} onChangeText={setManualName} placeholder="e.g. chicken tikka with roti" editable={!disabled} />
        <Button title="Auto-calculate macros with AI" variant="secondary" onPress={handleEstimateManual} loading={isEstimatingManual} disabled={isSaving} />
        <Input label="Portion" value={manualPortion} onChangeText={setManualPortion} editable={!disabled} containerStyle={{ marginTop: 18 }} />
        <Input label="Calories (kcal) *" value={manualCalories} onChangeText={setManualCalories} editable={!disabled} keyboardType="numeric" placeholder="Leave blank to estimate" />
        <View style={styles.macros}>{[['Protein', manualProtein, setManualProtein],['Carbs', manualCarbs, setManualCarbs],['Fat', manualFat, setManualFat]].map(([label, value, onChangeText]) => <Input key={label} label={label} value={value} onChangeText={onChangeText} editable={!disabled} keyboardType="numeric" unit="g" containerStyle={{ flex: 1 }} />)}</View>
        <Button title="Save Meal" onPress={handleSaveManual} loading={isSaving} disabled={isEstimatingManual} fullWidth />
      </Card>}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, camera: { flex: 1, backgroundColor: '#000' }, cameraHeader: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  close: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(28,28,30,0.9)', justifyContent: 'center', alignItems: 'center' },
  tabs: { flex: 1, flexDirection: 'row', padding: 4, gap: 2, borderRadius: 16, backgroundColor: 'rgba(28,28,30,0.94)' }, tab: { flex: 1, minHeight: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 3 }, selectedTab: { backgroundColor: colors.sageBright }, tabText: { color: colors.textSecondary, fontSize: 10, fontWeight: '600' },
  heading: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 18 }, title: { ...typography.title2 }, subtitle: { ...typography.bodyMuted, marginTop: 6 }, form: { padding: 18, paddingBottom: 40, gap: 18 }, cardTitle: { ...typography.title3 },
  mealTypes: { flexDirection: 'row', gap: 6, marginVertical: 18 }, mealType: { paddingVertical: 12, paddingHorizontal: 9, borderRadius: 12, backgroundColor: colors.cardElevated }, activeMeal: { backgroundColor: colors.sageDark }, typeText: { color: colors.textPrimary, fontSize: 12 }, macros: { flexDirection: 'row', gap: 8 }, hint: { ...typography.caption, color: colors.textSecondary, marginTop: 16, lineHeight: 19 },
});

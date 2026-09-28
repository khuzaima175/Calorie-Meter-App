// src/screens/LogMealScreen.js
// 5-Tab Smart Meal Logger: AI Photo, Text NLP, Nutrition Label OCR, Barcode Scanner, & Manual Entry

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNutritionStore } from '../stores/useNutritionStore';
import CameraScanner from '../components/CameraScanner';
import BarcodeScanner from '../components/BarcodeScanner';
import NutritionLabelScanner from '../components/NutritionLabelScanner';
import FoodAnalysisResult from '../components/FoodAnalysisResult';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import {
  analyzeFoodPhoto,
  analyzeNutritionLabel,
  parseMealDescription,
} from '../services/geminiService';
import { lookupBarcode } from '../services/barcodeService';
import { colors, radius, typography } from '../theme/colors';

const TABS = [
  { key: 'photo', label: 'Photo', icon: 'camera-outline' },
  { key: 'text', label: 'Text', icon: 'text-outline' },
  { key: 'label', label: 'Label', icon: 'document-text-outline' },
  { key: 'barcode', label: 'Barcode', icon: 'barcode-outline' },
  { key: 'manual', label: 'Manual', icon: 'create-outline' },
];

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

export default function LogMealScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const addMeal = useNutritionStore((s) => s.addMeal);
  const logWater = useNutritionStore((s) => s.logWater);

  const [activeTab, setActiveTab] = useState('photo');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [capturedImageUri, setCapturedImageUri] = useState(null);
  const [capturedImageUris, setCapturedImageUris] = useState([]);
  const barcodeReqIdRef = useRef(0);

  // Text AI Tab State
  const [textDescription, setTextDescription] = useState('');

  // Manual Tab State
  const [manualName, setManualName] = useState('');
  const [manualMealType, setManualMealType] = useState('lunch');
  const [manualPortion, setManualPortion] = useState('1 serving');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

  const isCameraMode =
    (activeTab === 'photo' || activeTab === 'label' || activeTab === 'barcode') &&
    !analysisResult;

  const handleTabChange = (tabKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveTab(tabKey);
    setAnalysisResult(null);
    setCapturedImageUri(null);
    setCapturedImageUris([]);
  };

  // 1. Photo Analysis Handler (supports multi-image & Pakistani meal context)
  const handleCapturePhoto = async (capturePayload) => {
    const { uri, base64, mimeType, photos = [], userNote = '', mealPeriod } = capturePayload;
    setIsProcessing(true);
    setStatusMessage('Analyzing Pakistani / Desi meal with Gemini AI...');

    const uriList = photos.length > 0 ? photos.map((p) => p.uri) : [uri];
    setCapturedImageUri(uriList[0]);
    setCapturedImageUris(uriList);

    try {
      const photosToAnalyze = photos.length > 0 ? photos : [{ uri, base64, mimeType }];
      const result = await analyzeFoodPhoto(photosToAnalyze, mimeType, {
        userNote,
        mealPeriod,
      });
      setAnalysisResult(result);
    } catch (err) {
      Alert.alert(
        'Analysis Failed',
        err.message || 'Could not analyze photo. Please try again or type the meal.'
      );
      setCapturedImageUri(null);
      setCapturedImageUris([]);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // 2. Text Analysis Handler
  const handleAnalyzeText = async () => {
    if (!textDescription.trim()) {
      Alert.alert(
        'Empty Description',
        'Please type what you ate (e.g. "Grilled chicken salad with avocado and olive oil dressing").'
      );
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Estimating macros with Gemini AI...');

    try {
      const result = await parseMealDescription(textDescription.trim());
      setAnalysisResult(result);
    } catch (err) {
      Alert.alert(
        'Parsing Failed',
        err.message || 'Could not calculate macros. Please try again.'
      );
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // 3. Label OCR Handler
  const handleCaptureLabel = async ({ uri, base64, mimeType }) => {
    setIsProcessing(true);
    setStatusMessage('Reading Nutrition Facts table...');
    setCapturedImageUri(uri);

    try {
      const result = await analyzeNutritionLabel(base64, mimeType);
      setAnalysisResult(result);
    } catch (err) {
      Alert.alert(
        'OCR Failed',
        err.message || 'Could not read nutrition facts. Make sure label is in clear view.'
      );
      setCapturedImageUri(null);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // 4. Barcode Lookup Handler (with stale request discard)
  const handleScanBarcode = async (barcode) => {
    const currentReqId = ++barcodeReqIdRef.current;
    setIsProcessing(true);
    setStatusMessage(`Looking up barcode ${barcode}...`);

    try {
      const result = await lookupBarcode(barcode);
      if (currentReqId !== barcodeReqIdRef.current) return;
      setAnalysisResult(result);
      if (result.image_uri) {
        setCapturedImageUri(result.image_uri);
      }
    } catch (err) {
      if (currentReqId !== barcodeReqIdRef.current) return;
      Alert.alert(
        'Product Not Found',
        `${err.message}\nYou can log it manually or scan the Nutrition Facts label.`
      );
    } finally {
      if (currentReqId === barcodeReqIdRef.current) {
        setIsProcessing(false);
        setStatusMessage('');
      }
    }
  };

  // 5. Manual Save Handler (with double-tap guard and strict bounds validation)
  const handleSaveManual = async () => {
    if (isSaving) return;

    const calNum = Number(manualCalories);
    const protNum = Number(manualProtein) || 0;
    const carbsNum = Number(manualCarbs) || 0;
    const fatNum = Number(manualFat) || 0;

    if (!manualName.trim()) {
      Alert.alert('Missing Name', 'Please enter a food or meal name.');
      return;
    }
    if (isNaN(calNum) || calNum <= 0 || calNum > 10000) {
      Alert.alert('Invalid Calories', 'Please enter realistic calories between 1 and 10,000.');
      return;
    }
    if (protNum < 0 || protNum > 1000 || carbsNum < 0 || carbsNum > 1000 || fatNum < 0 || fatNum > 1000) {
      Alert.alert('Invalid Macros', 'Macronutrient values must be realistic positive numbers.');
      return;
    }

    setIsSaving(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      await addMeal({
        name: manualName.trim(),
        meal_type: manualMealType,
        portion: manualPortion.trim() || '1 serving',
        calories: calNum,
        protein: protNum,
        carbs: carbsNum,
        fat: fatNum,
      });

      navigation.navigate('Dashboard');
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Could not save meal.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Confirmed AI Analysis Result (with double-tap guard)
  const handleSaveAnalysisResult = async (finalMealData) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (finalMealData.is_water) {
        await logWater(finalMealData.water_ml || 250);
      } else {
        await addMeal(finalMealData);
      }
      setAnalysisResult(null);
      setCapturedImageUri(null);
      setCapturedImageUris([]);
      navigation.navigate('Dashboard');
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Could not save meal data.');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // VIEW A: DEDICATED FULL-SCREEN CAMERA VIEW
  // ==========================================
  if (isCameraMode) {
    return (
      <View style={styles.cameraFullScreenContainer}>
        {/* 1. Full Screen Camera Viewport (100% Dimensions) */}
        {activeTab === 'photo' && (
          <CameraScanner
            onCapturePhoto={handleCapturePhoto}
            isProcessing={isProcessing}
          />
        )}
        {activeTab === 'label' && (
          <NutritionLabelScanner
            onCaptureLabel={handleCaptureLabel}
            isProcessing={isProcessing}
          />
        )}
        {activeTab === 'barcode' && (
          <BarcodeScanner
            onScanBarcode={handleScanBarcode}
            isProcessing={isProcessing}
          />
        )}

        {/* 2. Floating Top Header & 5-Column Segmented Bar (respects insets.top) */}
        <View style={[styles.floatingHeaderWrapper, { top: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.closeCameraBtn}
            onPress={() => navigation.navigate('Dashboard')}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.segmentedTabsContainer}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.segmentedTabBtn,
                    isActive && styles.segmentedTabBtnActive,
                  ]}
                  onPress={() => handleTabChange(tab.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={isActive ? colors.textInverse : 'rgba(255, 255, 255, 0.7)'}
                  />
                  <Text
                    style={[
                      styles.segmentedTabText,
                      isActive && styles.segmentedTabTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Processing Overlay */}
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingCard}>
              <ActivityIndicator size="large" color={colors.sageBright} />
              <Text style={styles.processingTitle}>Analyzing with AI</Text>
              <Text style={styles.processingText}>{statusMessage}</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  // ==========================================
  // VIEW B: REVIEW RESULT & FORM ENTRY VIEW
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Header Title with Back Button */}
        <View style={styles.header}>
          <View style={styles.formHeaderRow}>
            <TouchableOpacity
              style={styles.formBackBtn}
              onPress={() => {
                if (analysisResult) {
                  setAnalysisResult(null);
                  setCapturedImageUri(null);
                } else {
                  navigation.navigate('Dashboard');
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.titleText}>
                {analysisResult ? 'Review Nutrition' : 'Log Nutrition'}
              </Text>
              <Text style={styles.subtitleText} numberOfLines={1}>
                {analysisResult
                  ? 'Verify detected macronutrients and add to diary'
                  : 'Snap a photo, scan a barcode, or describe meal'}
              </Text>
            </View>
          </View>
        </View>

        {/* 5-Tab Mode Selector (When not reviewing) */}
        {!analysisResult && (
          <View style={styles.tabBarContainer}>
            <View style={styles.segmentedTabsContainerForm}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.segmentedTabBtnForm, isActive && styles.segmentedTabBtnFormActive]}
                    onPress={() => handleTabChange(tab.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={14}
                      color={isActive ? colors.textInverse : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.segmentedTabTextForm,
                        isActive && styles.segmentedTabTextFormActive,
                      ]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingCard}>
              <ActivityIndicator size="large" color={colors.sageBright} />
              <Text style={styles.processingTitle}>Analyzing with AI</Text>
              <Text style={styles.processingText}>{statusMessage}</Text>
            </View>
          </View>
        )}

        {/* Main Content Area */}
        {analysisResult ? (
          <View style={styles.resultContainer}>
            <FoodAnalysisResult
              analysis={analysisResult}
              imageUri={capturedImageUri}
              imageUris={capturedImageUris}
              isSaving={isSaving}
              onSave={handleSaveAnalysisResult}
              onCancel={() => {
                setAnalysisResult(null);
                setCapturedImageUri(null);
                setCapturedImageUris([]);
              }}
              onSwitchToText={() => handleTabChange('text')}
            />
          </View>
        ) : (
          <View style={styles.tabContent}>
            {/* TAB 2: TEXT AI PARSER */}
            {activeTab === 'text' && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollForm}
              >
                <Card style={styles.textCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="sparkles" size={18} color={colors.sageBright} />
                    <Text style={styles.cardTitle}>Describe Your Meal</Text>
                  </View>
                  <Text style={styles.cardSubtitle}>
                    Mention foods and quantities in your own words. Gemini AI will calculate macros
                    automatically.
                  </Text>

                  <Input
                    placeholder="e.g. 2 eggs scrambled in butter with 2 slices whole wheat toast and half an avocado..."
                    value={textDescription}
                    onChangeText={setTextDescription}
                    multiline
                    numberOfLines={4}
                    containerStyle={{ marginVertical: 12 }}
                  />

                  {/* Sample Pakistani suggestions */}
                  <Text style={styles.examplesLabel}>Popular Pakistani meal examples:</Text>
                  <View style={styles.examplesRow}>
                    {[
                      '2 Whole Wheat Rotis + 1 cup Chicken Karahi + Salad',
                      '1 plate Chicken Biryani with Raita (ate 50%)',
                      '1 Anda Paratha + 1 cup Karak Doodh Patti Chai',
                      '1 cup Daal Chana + 1 Tandoori Roti',
                      '1 Chicken Shami Bun Kabab with Mint Chutney',
                    ].map((example, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.exampleChip}
                        onPress={() => setTextDescription(example)}
                      >
                        <Text style={styles.exampleChipText} numberOfLines={1}>
                          {example}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Button
                    title="Calculate Nutrition with AI"
                    onPress={handleAnalyzeText}
                    loading={isProcessing}
                    size="lg"
                    style={{ marginTop: 16 }}
                  />
                </Card>
              </ScrollView>
            )}

            {/* TAB 5: MANUAL LOGGING */}
            {activeTab === 'manual' && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollForm}
              >
                <Card style={styles.manualCard}>
                  <Text style={styles.manualHeading}>Quick Manual Log</Text>

                  {/* Meal Category */}
                  <View style={styles.typePillRow}>
                    {MEAL_TYPES.map((t) => {
                      const isSelected = manualMealType === t.key;
                      return (
                        <TouchableOpacity
                          key={t.key}
                          style={[styles.typePill, isSelected && styles.typePillSelected]}
                          onPress={() => setManualMealType(t.key)}
                        >
                          <Text
                            style={[
                              styles.typePillText,
                              isSelected && styles.typePillTextSelected,
                            ]}
                          >
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Input
                    label="Meal / Food Name"
                    placeholder="e.g. Oatmeal with Berries"
                    value={manualName}
                    onChangeText={setManualName}
                    clearable
                  />

                  <Input
                    label="Portion"
                    placeholder="e.g. 1 bowl (250g)"
                    value={manualPortion}
                    onChangeText={setManualPortion}
                  />

                  <Input
                    label="Calories (kcal) *"
                    placeholder="0"
                    value={manualCalories}
                    onChangeText={setManualCalories}
                    keyboardType="numeric"
                    unit="kcal"
                  />

                  <View style={styles.macroGrid}>
                    <View style={styles.macroCol}>
                      <Input
                        label="Protein"
                        placeholder="0"
                        value={manualProtein}
                        onChangeText={setManualProtein}
                        keyboardType="numeric"
                        unit="g"
                      />
                    </View>
                    <View style={styles.macroCol}>
                      <Input
                        label="Carbs"
                        placeholder="0"
                        value={manualCarbs}
                        onChangeText={setManualCarbs}
                        keyboardType="numeric"
                        unit="g"
                      />
                    </View>
                    <View style={styles.macroCol}>
                      <Input
                        label="Fat"
                        placeholder="0"
                        value={manualFat}
                        onChangeText={setManualFat}
                        keyboardType="numeric"
                        unit="g"
                      />
                    </View>
                  </View>

                  <Button
                    title="Save Meal"
                    onPress={handleSaveManual}
                    size="lg"
                    style={{ marginTop: 12 }}
                  />
                </Card>
              </ScrollView>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cameraFullScreenContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  floatingHeaderWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 30,
    backgroundColor: 'rgba(18, 18, 20, 0.92)',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  closeCameraBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  segmentedTabsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    padding: 2,
  },
  segmentedTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 16,
  },
  segmentedTabBtnActive: {
    backgroundColor: colors.sageBright,
  },
  segmentedTabText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    marginLeft: 3,
    letterSpacing: -0.2,
  },
  segmentedTabTextActive: {
    color: '#0A1B10',
    fontWeight: '800',
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    marginBottom: 12,
  },
  titleText: {
    ...typography.title2,
  },
  subtitleText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tabBarContainer: {
    marginBottom: 12,
  },
  segmentedTabsContainerForm: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E22',
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  segmentedTabBtnForm: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 20,
  },
  segmentedTabBtnFormActive: {
    backgroundColor: colors.sageBright,
  },
  segmentedTabTextForm: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 3,
  },
  segmentedTabTextFormActive: {
    color: '#0A1B10',
    fontWeight: '800',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 5,
  },
  cameraTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginLeft: 5,
  },
  tabTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  cameraTabTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
  },
  resultContainer: {
    flex: 1,
    paddingBottom: 90,
  },
  scrollForm: {
    paddingBottom: 110,
    paddingTop: 4,
  },
  textCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 6,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  examplesLabel: {
    ...typography.micro,
    color: colors.textTertiary,
    marginBottom: 6,
  },
  examplesRow: {
    marginBottom: 10,
  },
  exampleChip: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  exampleChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  manualCard: {
    padding: 16,
  },
  manualHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  typePillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  typePill: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: radius.md,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
  },
  typePillSelected: {
    backgroundColor: colors.sageBright,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typePillTextSelected: {
    color: colors.textInverse,
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroCol: {
    flex: 1,
    marginHorizontal: 4,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 12, 0.85)',
    zIndex: 99,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  processingCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    width: '85%',
  },
  processingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 14,
    marginBottom: 4,
  },
  processingText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

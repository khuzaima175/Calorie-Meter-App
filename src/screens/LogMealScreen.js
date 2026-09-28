// src/screens/LogMealScreen.js
// 5-Tab Smart Meal Logger: AI Photo, Text NLP, Nutrition Label OCR, Barcode Scanner, & Manual Entry

import React, { useState } from 'react';
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
  { key: 'photo', label: 'Photo AI', icon: 'camera-outline' },
  { key: 'text', label: 'Text AI', icon: 'text-outline' },
  { key: 'label', label: 'Label OCR', icon: 'document-text-outline' },
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

  const [activeTab, setActiveTab] = useState('photo');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [capturedImageUri, setCapturedImageUri] = useState(null);

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
  };

  // 1. Photo Analysis Handler
  const handleCapturePhoto = async ({ uri, base64, mimeType }) => {
    setIsProcessing(true);
    setStatusMessage('Analyzing meal photo with Gemini AI...');
    setCapturedImageUri(uri);

    try {
      const result = await analyzeFoodPhoto(base64, mimeType);
      setAnalysisResult(result);
    } catch (err) {
      Alert.alert(
        'Analysis Failed',
        err.message || 'Could not analyze photo. Please try again or type the meal.'
      );
      setCapturedImageUri(null);
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

  // 4. Barcode Lookup Handler
  const handleScanBarcode = async (barcode) => {
    setIsProcessing(true);
    setStatusMessage(`Looking up barcode ${barcode}...`);

    try {
      const result = await lookupBarcode(barcode);
      setAnalysisResult(result);
      if (result.image_uri) {
        setCapturedImageUri(result.image_uri);
      }
    } catch (err) {
      Alert.alert(
        'Product Not Found',
        `${err.message}\nYou can log it manually or scan the Nutrition Facts label.`
      );
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // 5. Manual Save Handler
  const handleSaveManual = async () => {
    if (!manualName.trim()) {
      Alert.alert('Missing Name', 'Please enter a food or meal name.');
      return;
    }
    if (!manualCalories || isNaN(Number(manualCalories))) {
      Alert.alert('Missing Calories', 'Please enter valid calories.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    await addMeal({
      name: manualName.trim(),
      meal_type: manualMealType,
      portion: manualPortion.trim() || '1 serving',
      calories: Number(manualCalories),
      protein: Number(manualProtein) || 0,
      carbs: Number(manualCarbs) || 0,
      fat: Number(manualFat) || 0,
    });

    navigation.navigate('Dashboard');
  };

  // Save Confirmed AI Analysis Result
  const handleSaveAnalysisResult = async (finalMealData) => {
    await addMeal(finalMealData);
    setAnalysisResult(null);
    setCapturedImageUri(null);
    navigation.navigate('Dashboard');
  };

  // ==========================================
  // VIEW A: DEDICATED FULL-SCREEN CAMERA VIEW
  // ==========================================
  if (isCameraMode) {
    return (
      <View
        style={styles.cameraFullScreenContainer}
        onLayout={(e) => console.log('[LAYOUT] cameraFullScreen', JSON.stringify(e.nativeEvent.layout))}
      >
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

        {/* 2. Floating Top Header & Tab Pills (respects insets.top) */}
        <View style={[styles.floatingHeaderWrapper, { top: insets.top + 8 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.cameraTabBtn,
                    isActive && styles.cameraTabBtnActive,
                  ]}
                  onPress={() => handleTabChange(tab.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={tab.icon}
                    size={15}
                    color={isActive ? colors.textInverse : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.cameraTabText,
                      isActive && styles.cameraTabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.titleText}>
            {analysisResult ? 'Review Nutrition' : 'Log Nutrition'}
          </Text>
          <Text style={styles.subtitleText}>
            {analysisResult
              ? 'Verify AI detected macronutrients and add to diary'
              : 'Snap a photo, scan a barcode, or describe your meal'}
          </Text>
        </View>

        {/* 5-Tab Mode Selector Pills (When not reviewing) */}
        {!analysisResult && (
          <View style={styles.tabBarContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabScrollContent}
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                    onPress={() => handleTabChange(tab.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={15}
                      color={isActive ? colors.textInverse : colors.textSecondary}
                    />
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
              onSave={handleSaveAnalysisResult}
              onCancel={() => {
                setAnalysisResult(null);
                setCapturedImageUri(null);
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

                  {/* Sample suggestions */}
                  <Text style={styles.examplesLabel}>Try quick examples:</Text>
                  <View style={styles.examplesRow}>
                    {[
                      '1 cup Greek yogurt with honey and 30g walnuts',
                      'Grilled chicken breast 200g, 1 cup brown rice, steamed broccoli',
                      'Double espresso with 250ml oat milk',
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
    backgroundColor: '#000000',
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
    left: 16,
    right: 16,
    zIndex: 30,
    backgroundColor: 'rgba(18, 18, 20, 0.75)',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
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
  tabScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 6,
  },
  cameraTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    marginRight: 4,
  },
  tabBtnActive: {
    backgroundColor: colors.sageBright,
    borderColor: colors.sageBright,
  },
  cameraTabBtnActive: {
    backgroundColor: colors.sageBright,
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

import { Alert } from '../services/alertService';
// src/components/AddExerciseModal.js
// Feature-rich Workout & Daily Walking Logger: Walking/Steps Calculator, Categorized Presets, and AI Smart Estimator

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Input from './Input';
import Button from './Button';
import { colors, radius, typography } from '../theme/colors';
import { estimateExerciseFromText } from '../services/geminiService';

import { walkingStats as calculateWalkingStats, presetCalories } from '../services/exerciseCalculations';

const WALKING_PACES = [
  { key: 'casual', label: '🚶 Casual Stroll', met: 2.8, speedKmh: 3.5, stepsPerMin: 95 },
  { key: 'moderate', label: '👟 Moderate Walk', met: 3.5, speedKmh: 4.8, stepsPerMin: 105 },
  { key: 'brisk', label: '⚡ Brisk Fitness', met: 4.3, speedKmh: 6.0, stepsPerMin: 120 },
  { key: 'incline', label: '⛰️ Incline / Power', met: 5.3, speedKmh: 6.5, stepsPerMin: 130 },
];

const PRESETS = [
  // Cardio
  { name: 'Running / Jogging', met: 9.8, category: 'cardio', intensity: 'high', icon: 'flame-outline' },
  { name: 'Cycling', met: 7.5, category: 'cardio', intensity: 'moderate', icon: 'bicycle-outline' },
  { name: 'Jump Rope', met: 11.0, category: 'cardio', intensity: 'high', icon: 'flash-outline' },
  { name: 'HIIT Circuit', met: 8.5, category: 'cardio', intensity: 'high', icon: 'timer-outline' },
  { name: 'Swimming', met: 7.0, category: 'cardio', intensity: 'high', icon: 'water-outline' },
  { name: 'Stair Climber', met: 8.5, category: 'cardio', intensity: 'high', icon: 'trending-up-outline' },
  { name: 'Elliptical', met: 6.0, category: 'cardio', intensity: 'moderate', icon: 'repeat-outline' },

  // Strength
  { name: 'Strength Training', met: 5.0, category: 'strength', intensity: 'moderate', icon: 'barbell-outline' },
  { name: 'Calisthenics / Pushups', met: 4.5, category: 'strength', intensity: 'moderate', icon: 'body-outline' },
  { name: 'CrossFit / WOD', met: 8.0, category: 'strength', intensity: 'high', icon: 'fitness-outline' },
  { name: 'Kettlebell Workout', met: 7.5, category: 'strength', intensity: 'high', icon: 'shield-outline' },

  // Sports
  { name: 'Cricket (Match / Nets)', met: 5.0, category: 'sports', intensity: 'moderate', icon: 'trophy-outline' },
  { name: 'Badminton', met: 5.5, category: 'sports', intensity: 'moderate', icon: 'tennisball-outline' },
  { name: 'Football / Soccer', met: 7.0, category: 'sports', intensity: 'high', icon: 'football-outline' },
  { name: 'Basketball', met: 6.5, category: 'sports', intensity: 'high', icon: 'basketball-outline' },
  { name: 'Tennis', met: 7.3, category: 'sports', intensity: 'high', icon: 'tennisball-outline' },
  { name: 'Boxing / Heavy Bag', met: 8.5, category: 'sports', intensity: 'high', icon: 'hand-left-outline' },

  // Mind & Body
  { name: 'Yoga & Mobility', met: 3.0, category: 'flexibility', intensity: 'low', icon: 'body-outline' },
  { name: 'Pilates', met: 3.5, category: 'flexibility', intensity: 'low', icon: 'leaf-outline' },
  { name: 'Stretching & Foam Roll', met: 2.5, category: 'flexibility', intensity: 'low', icon: 'expand-outline' },
];

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'strength', label: 'Strength' },
  { key: 'sports', label: 'Sports' },
  { key: 'flexibility', label: 'Mind & Body' },
];

export default function AddExerciseModal({
  visible,
  onClose,
  onSave,
  userWeightKg = 75,
  date,
}) {
  const weight = Number(userWeightKg) > 0 ? Number(userWeightKg) : 75;

  // Active top mode tab: 'walking' | 'presets' | 'ai'
  const [activeTab, setActiveTab] = useState('walking');

  // Walking & Steps State
  const [walkMode, setWalkMode] = useState('duration'); // 'duration' | 'steps'
  const [walkDurationMins, setWalkDurationMins] = useState('30');
  const [walkStepsCount, setWalkStepsCount] = useState('3150');
  const [selectedWalkPace, setSelectedWalkPace] = useState(WALKING_PACES[1]); // moderate

  // Workouts & Presets State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [customName, setCustomName] = useState('');
  const [duration, setDuration] = useState('30');
  const [caloriesBurned, setCaloriesBurned] = useState(String(Math.round(9.8 * 3.5 * weight / 200 * 30)));
  const [intensity, setIntensity] = useState(PRESETS[0].intensity);
  const [category, setCategory] = useState('cardio');
  const [isManualCalorie, setIsManualCalorie] = useState(false);

  // AI Smart Estimate State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isEstimatingAI, setIsEstimatingAI] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const [isSaving, setIsSaving] = useState(false);

  const estimateRequest = useRef(0);
  const savePending = useRef(false);
  useEffect(() => {
    estimateRequest.current++;
    setAiResult(null);
    setIsEstimatingAI(false);
    savePending.current = false;
    setIsSaving(false);
    return () => { estimateRequest.current++; };
  }, [visible, weight]);

  useEffect(() => {
    if (!isManualCalorie && selectedPreset) {
      setCaloriesBurned(String(presetCalories(selectedPreset, duration, intensity, weight)));
    }
  }, [selectedPreset, duration, intensity, weight, isManualCalorie]);

  const getWalkingStats = () => calculateWalkingStats(walkMode, walkDurationMins, walkStepsCount, selectedWalkPace, weight);

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setCustomName(preset.name);
    setCategory(preset.category);
    setIntensity(preset.intensity);
  };

  const handleDurationChange = (val) => setDuration(val);
  const handleIntensityChange = (int) => setIntensity(int);

  // AI Estimate Handler
  const handleEstimateAI = async () => {
    if (!aiPrompt.trim()) {
      Alert.alert('Empty Input', 'Please describe what workout or activity you did.');
      return;
    }
    if (isEstimatingAI || isSaving) return;
    const request = ++estimateRequest.current;
    setAiResult(null);
    setIsEstimatingAI(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      const result = await estimateExerciseFromText(aiPrompt.trim(), weight);
      if (request !== estimateRequest.current) return;
      setAiResult(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      if (request !== estimateRequest.current) return;
      Alert.alert('AI Estimation Failed', err.message || 'Could not estimate calories. Try presets or manual logging.');
    } finally {
      if (request === estimateRequest.current) setIsEstimatingAI(false);
    }
  };

  // Save Workout to Diary
  const handleSave = async () => {
    if (savePending.current || isSaving || isEstimatingAI) return;

    let finalName = '';
    let finalMins = 30;
    let finalCals = 0;
    let finalIntensity = 'moderate';
    let finalCategory = 'cardio';

    if (activeTab === 'walking') {
      const stats = getWalkingStats();
      if (!stats.valid) {
        Alert.alert('Invalid Walk', 'Enter positive whole steps or a duration corresponding to 1–720 minutes.');
        return;
      }
      finalName = `${selectedWalkPace.label.replace(/^[^\w]+/, '')} (${stats.steps.toLocaleString()} steps)`;
      finalMins = stats.mins;
      finalCals = stats.calories;
      finalIntensity = selectedWalkPace.key === 'incline' || selectedWalkPace.key === 'brisk' ? 'moderate' : 'low';
      finalCategory = 'walking';
    } else if (activeTab === 'presets') {
      finalName = customName.trim() || selectedPreset?.name || 'Workout';
      finalMins = Number(duration);
      finalCals = Number(caloriesBurned);
      finalIntensity = intensity;
      finalCategory = category;
    } else if (activeTab === 'ai') {
      if (!aiResult) {
        Alert.alert('Not Estimated', 'Tap "Estimate with AI" first to calculate calories.');
        return;
      }
      finalName = aiResult.exercise_name || 'Workout';
      finalMins = aiResult.duration_minutes || 30;
      finalCals = aiResult.calories_burned || 0;
      finalIntensity = aiResult.intensity || 'moderate';
      finalCategory = aiResult.category || 'cardio';
    }

    if (!Number.isFinite(finalMins) || finalMins < 1 || finalMins > 720 || !Number.isFinite(finalCals) || finalCals < 0 || finalCals > 10000) {
      Alert.alert('Invalid Workout', 'Enter a duration of 1–720 minutes and calories of 0–10,000.');
      return;
    }
    const saveSession = estimateRequest.current;
    savePending.current = true;
    setIsSaving(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      await onSave({
        date,
        exercise_name: finalName,
        duration_minutes: finalMins,
        calories_burned: finalCals,
        intensity: finalIntensity,
        category: finalCategory,
        timestamp: new Date().toISOString(),
      });

      if (saveSession !== estimateRequest.current) return;
      // Reset & Close
      setAiResult(null);
      setAiPrompt('');
      onClose();
    } catch (err) {
      if (saveSession !== estimateRequest.current) return;
      console.warn('Failed to save exercise:', err);
      Alert.alert('Save Failed', err.message || 'Could not save exercise.');
    } finally {
      if (saveSession === estimateRequest.current) { savePending.current = false; setIsSaving(false); }
    }
  };

  const filteredPresets = selectedCategory === 'all'
    ? PRESETS
    : PRESETS.filter((p) => p.category === selectedCategory);

  const walkingStats = getWalkingStats();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => { if (!isSaving && !isEstimatingAI) onClose(); }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.titleText}>Log Movement & Workout</Text>
              <Text style={styles.headerWeightHint}>Calibrated for your weight: {weight} kg</Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isSaving || isEstimatingAI} accessibilityRole="button" accessibilityLabel="Close workout form" style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.segmentedContainer}>
            <TouchableOpacity disabled={isSaving || isEstimatingAI} accessibilityRole="button"
              style={[styles.segmentBtn, activeTab === 'walking' && styles.segmentBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setActiveTab('walking');
              }}
            >
              <Ionicons
                name="walk-outline"
                size={14}
                color={activeTab === 'walking' ? '#08170E' : 'rgba(255, 255, 255, 0.7)'}
              />
              <Text style={[styles.segmentBtnText, activeTab === 'walking' && styles.segmentBtnTextActive]}>
                Walk & Steps
              </Text>
            </TouchableOpacity>

            <TouchableOpacity disabled={isSaving || isEstimatingAI} accessibilityRole="button"
              style={[styles.segmentBtn, activeTab === 'presets' && styles.segmentBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setActiveTab('presets');
              }}
            >
              <Ionicons
                name="barbell-outline"
                size={14}
                color={activeTab === 'presets' ? '#08170E' : 'rgba(255, 255, 255, 0.7)'}
              />
              <Text style={[styles.segmentBtnText, activeTab === 'presets' && styles.segmentBtnTextActive]}>
                Workouts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity disabled={isSaving || isEstimatingAI} accessibilityRole="button"
              style={[styles.segmentBtn, activeTab === 'ai' && styles.segmentBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setActiveTab('ai');
              }}
            >
              <Ionicons
                name="sparkles"
                size={13}
                color={activeTab === 'ai' ? '#08170E' : colors.sageBright}
              />
              <Text style={[styles.segmentBtnText, activeTab === 'ai' && styles.segmentBtnTextActive]}>
                AI Estimate
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* ======================================= */}
            {/* TAB 1: DAILY WALK & STEPS CALCULATOR   */}
            {/* ======================================= */}
            {activeTab === 'walking' && (
              <View>
                {/* Metric Mode Switcher */}
                <View style={styles.walkToggleRow}>
                  <TouchableOpacity disabled={isSaving || isEstimatingAI} accessibilityRole="button"
                    style={[styles.walkToggleBtn, walkMode === 'duration' && styles.walkToggleBtnActive]}
                    onPress={() => { setWalkDurationMins(String(getWalkingStats().mins)); setWalkMode('duration'); }}
                  >
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={walkMode === 'duration' ? colors.sageBright : colors.textSecondary}
                    />
                    <Text style={[styles.walkToggleText, walkMode === 'duration' && styles.walkToggleTextActive]}>
                      By Minutes Walked
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity disabled={isSaving || isEstimatingAI} accessibilityRole="button"
                    style={[styles.walkToggleBtn, walkMode === 'steps' && styles.walkToggleBtnActive]}
                    onPress={() => { setWalkStepsCount(String(getWalkingStats().steps)); setWalkMode('steps'); }}
                  >
                    <Ionicons
                      name="footsteps-outline"
                      size={14}
                      color={walkMode === 'steps' ? colors.sageBright : colors.textSecondary}
                    />
                    <Text style={[styles.walkToggleText, walkMode === 'steps' && styles.walkToggleTextActive]}>
                      By Step Count
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Primary Input */}
                {walkMode === 'duration' ? (
                  <Input editable={!(isSaving || isEstimatingAI)}
                    label="Minutes Walked"
                    value={walkDurationMins}
                    onChangeText={setWalkDurationMins}
                    keyboardType="numeric"
                    unit="mins"
                    placeholder="e.g. 30"
                  />
                ) : (
                  <Input editable={!(isSaving || isEstimatingAI)}
                    label="Steps Taken"
                    value={walkStepsCount}
                    onChangeText={setWalkStepsCount}
                    keyboardType="numeric"
                    unit="steps"
                    placeholder="e.g. 6000"
                  />
                )}

                {/* Walking Pace / Terrain Selector */}
                <Text style={styles.sectionLabel}>Walking Pace & Intensity</Text>
                <View style={styles.paceGrid}>
                  {WALKING_PACES.map((pace) => {
                    const isSelected = selectedWalkPace.key === pace.key;
                    return (
                      <TouchableOpacity disabled={isSaving || isEstimatingAI} accessibilityRole="button"
                        key={pace.key}
                        style={[styles.paceCard, isSelected && styles.paceCardActive]}
                        onPress={() => setSelectedWalkPace(pace)}
                      >
                        <Text style={[styles.paceTitle, isSelected && styles.paceTitleActive]}>
                          {pace.label}
                        </Text>
                        <Text style={styles.paceMeta}>
                          {pace.speedKmh} km/h • {pace.met} METs
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Quick Add Minutes / Steps Chips */}
                <Text style={styles.sectionLabel}>Quick Add Shortcuts</Text>
                <View style={styles.quickShortcutsRow}>
                  {['+15 min', '+30 min', '+45 min', '+5k steps', '+10k steps'].map((label, idx) => (
                    <TouchableOpacity disabled={isSaving || isEstimatingAI} accessibilityRole="button"
                      key={idx}
                      style={styles.quickShortcutChip}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        if (label.includes('min')) {
                          setWalkMode('duration');
                          setWalkDurationMins(String(getWalkingStats().mins + Number(label.replace('+', '').replace(' min', ''))));
                        } else {
                          setWalkMode('steps');
                          setWalkStepsCount(String(getWalkingStats().steps + (label.includes('10k') ? 10000 : 5000)));
                        }
                      }}
                    >
                      <Text style={styles.quickShortcutText}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Live Real-Time Calculation Metrics Card */}
                <View style={styles.liveMetricsCard}>
                  <View style={styles.liveMetricCol}>
                    <Text style={styles.liveMetricValue}>{walkingStats.calories}</Text>
                    <Text style={styles.liveMetricLabel}>kcal burned</Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.liveMetricCol}>
                    <Text style={styles.liveMetricValue}>{walkingStats.steps.toLocaleString()}</Text>
                    <Text style={styles.liveMetricLabel}>est. steps</Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.liveMetricCol}>
                    <Text style={styles.liveMetricValue}>{walkingStats.distanceKm}</Text>
                    <Text style={styles.liveMetricLabel}>km distance</Text>
                  </View>
                </View>
              </View>
            )}

            {/* ======================================= */}
            {/* TAB 2: WORKOUTS & CATEGORIZED PRESETS   */}
            {/* ======================================= */}
            {activeTab === 'presets' && (
              <View>
                {/* Category Filter Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                  contentContainerStyle={styles.categoryScrollContent}
                >
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.key;
                    return (
                      <TouchableOpacity disabled={isSaving || isEstimatingAI} accessibilityRole="button"
                        key={cat.key}
                        style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                        onPress={() => setSelectedCategory(cat.key)}
                      >
                        <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Presets Grid */}
                <Text style={styles.sectionLabel}>Activity Presets ({filteredPresets.length})</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.presetScroll}
                >
                  {filteredPresets.map((p) => {
                    const isSelected = selectedPreset?.name === p.name;
                    return (
                      <TouchableOpacity disabled={isSaving || isEstimatingAI} accessibilityRole="button"
                        key={p.name}
                        style={[
                          styles.presetCard,
                          isSelected && styles.presetCardActive,
                        ]}
                        onPress={() => handleSelectPreset(p)}
                      >
                        <Ionicons
                          name={p.icon}
                          size={22}
                          color={isSelected ? colors.sageBright : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.presetText,
                            isSelected && styles.presetTextActive,
                          ]}
                          numberOfLines={2}
                        >
                          {p.name}
                        </Text>
                        <Text style={styles.presetMetBadge}>{p.met} MET</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Workout Details */}
                <Input editable={!(isSaving || isEstimatingAI)}
                  label="Activity Name"
                  value={customName || selectedPreset?.name || ''}
                  onChangeText={setCustomName}
                  placeholder="e.g. Evening Football Match"
                />

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Input editable={!(isSaving || isEstimatingAI)}
                      label="Duration"
                      value={duration}
                      onChangeText={handleDurationChange}
                      keyboardType="numeric"
                      unit="mins"
                    />
                  </View>

                  <View style={styles.col}>
                    <Input editable={!(isSaving || isEstimatingAI)}
                      label="Calories Burned"
                      value={caloriesBurned}
                      onChangeText={(val) => {
                        setCaloriesBurned(val);
                        setIsManualCalorie(true);
                      }}
                      keyboardType="numeric"
                      unit="kcal"
                    />
                  </View>
                </View>

                {/* Intensity Selector */}
                <Text style={styles.sectionLabel}>Workout Intensity</Text>
                <View style={styles.intensityRow}>
                  {['low', 'moderate', 'high'].map((int) => {
                    const isSelected = intensity === int;
                    return (
                      <TouchableOpacity disabled={isSaving || isEstimatingAI} accessibilityRole="button"
                        key={int}
                        style={[
                          styles.intensityPill,
                          isSelected && styles.intensityPillActive,
                        ]}
                        onPress={() => handleIntensityChange(int)}
                      >
                        <Text
                          style={[
                            styles.intensityPillText,
                            isSelected && styles.intensityPillTextActive,
                          ]}
                        >
                          {int}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ======================================= */}
            {/* TAB 3: AI SMART WORKOUT ESTIMATOR       */}
            {/* ======================================= */}
            {activeTab === 'ai' && (
              <View>
                <Text style={styles.sectionLabel}>Describe Activity in Natural Words</Text>
                <Input editable={!(isSaving || isEstimatingAI)}
                  label=""
                  value={aiPrompt}
                  onChangeText={(value) => { setAiPrompt(value); setAiResult(null); }}
                  placeholder="e.g. Played 45 mins tape-ball cricket with 3 overs fast bowling, or walked briskly to market 35 mins"
                  multiline={true}
                  numberOfLines={3}
                />

                <TouchableOpacity accessibilityRole="button"
                  style={[styles.aiEstimateBtn, isEstimatingAI && styles.aiEstimateBtnDisabled]}
                  onPress={handleEstimateAI}
                  disabled={isSaving || isEstimatingAI}
                >
                  {isEstimatingAI ? (
                    <ActivityIndicator size="small" color="#08170E" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color="#08170E" />
                      <Text style={styles.aiEstimateBtnText}>Auto-Estimate with AI</Text>
                    </>
                  )}
                </TouchableOpacity>

                {aiResult && (
                  <View style={styles.aiResultCard}>
                    <View style={styles.aiResultHeader}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.sageBright} />
                      <Text style={styles.aiResultTitle}>{aiResult.exercise_name}</Text>
                    </View>

                    <View style={styles.aiResultRow}>
                      <View style={styles.aiResultCol}>
                        <Text style={styles.aiResultValue}>-{aiResult.calories_burned} kcal</Text>
                        <Text style={styles.aiResultLabel}>Calories Burned</Text>
                      </View>
                      <View style={styles.aiResultCol}>
                        <Text style={styles.aiResultValue}>{aiResult.duration_minutes} mins</Text>
                        <Text style={styles.aiResultLabel}>Active Time</Text>
                      </View>
                      <View style={styles.aiResultCol}>
                        <Text style={styles.aiResultValue}>{aiResult.met} MET</Text>
                        <Text style={styles.aiResultLabel}>Intensity ({aiResult.intensity})</Text>
                      </View>
                    </View>

                    {aiResult.explanation ? (
                      <Text style={styles.aiResultExpl}>{aiResult.explanation}</Text>
                    ) : null}
                  </View>
                )}
              </View>
            )}

            {/* Bottom Save CTA Button */}
            <Button
              title={
                activeTab === 'walking'
                  ? `Log Walk (${walkingStats.calories} kcal)`
                  : activeTab === 'ai' && aiResult
                  ? `Log ${aiResult.exercise_name} (${aiResult.calories_burned} kcal)`
                  : 'Log Exercise'
              }
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving}
              size="lg"
              style={styles.saveBtn}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerWeightHint: {
    fontSize: 11,
    color: colors.sageBright,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 4,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 22, 28, 0.9)',
    borderRadius: radius.full,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  segmentBtnActive: {
    backgroundColor: colors.sageBright,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.72)',
    marginLeft: 4,
  },
  segmentBtnTextActive: {
    color: '#08170E',
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  // Walk & Steps Styles
  walkToggleRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  walkToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardElevated,
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  walkToggleBtnActive: {
    borderColor: colors.sageBright,
    backgroundColor: 'rgba(107, 155, 125, 0.14)',
  },
  walkToggleText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: 5,
  },
  walkToggleTextActive: {
    color: colors.sageBright,
  },
  paceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  paceCard: {
    width: '48.5%',
    backgroundColor: colors.cardElevated,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  paceCardActive: {
    borderColor: colors.sageBright,
    backgroundColor: 'rgba(107, 155, 125, 0.12)',
  },
  paceTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  paceTitleActive: {
    color: colors.sageBright,
  },
  paceMeta: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 3,
  },
  quickShortcutsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  quickShortcutChip: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  quickShortcutText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  liveMetricsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(107, 155, 125, 0.1)',
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.3)',
  },
  liveMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(107, 155, 125, 0.25)',
  },
  liveMetricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.sageBright,
  },
  liveMetricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Presets Styles
  categoryScroll: {
    marginBottom: 12,
  },
  categoryScrollContent: {
    paddingRight: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.cardElevated,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  categoryPillActive: {
    backgroundColor: colors.sageBright,
    borderColor: colors.sageBright,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryPillTextActive: {
    color: '#08170E',
    fontWeight: '700',
  },
  presetScroll: {
    marginBottom: 14,
  },
  presetCard: {
    alignItems: 'center',
    backgroundColor: colors.cardElevated,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    width: 90,
    minHeight: 88,
    justifyContent: 'center',
  },
  presetCardActive: {
    borderColor: colors.sageBright,
    backgroundColor: 'rgba(107, 155, 125, 0.14)',
  },
  presetText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  presetTextActive: {
    color: colors.sageBright,
  },
  presetMetBadge: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
    marginHorizontal: 3,
  },
  intensityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  intensityPill: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: radius.md,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  intensityPillActive: {
    backgroundColor: colors.caloriesBurned,
    borderColor: colors.caloriesBurned,
  },
  intensityPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  intensityPillTextActive: {
    color: '#FFF',
  },
  // AI Estimate Styles
  aiEstimateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sageBright,
    paddingVertical: 11,
    borderRadius: radius.md,
    marginBottom: 14,
    shadowColor: colors.sageBright,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  aiEstimateBtnDisabled: {
    opacity: 0.6,
  },
  aiEstimateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#08170E',
    marginLeft: 6,
  },
  aiResultCard: {
    backgroundColor: colors.cardElevated,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.4)',
    marginBottom: 16,
  },
  aiResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiResultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 6,
  },
  aiResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiResultCol: {
    alignItems: 'center',
    flex: 1,
  },
  aiResultValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.sageBright,
  },
  aiResultLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 2,
  },
  aiResultExpl: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  saveBtn: {
    marginTop: 6,
    marginBottom: 20,
  },
});

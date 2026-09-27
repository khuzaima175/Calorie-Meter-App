// src/components/AddExerciseModal.js
// Modal to add workouts with presets and automatic MET-based calorie burn calculation

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Input from './Input';
import Button from './Button';
import { colors, radius, typography } from '../theme/colors';

const PRESETS = [
  { name: 'Running', met: 9.8, category: 'cardio', intensity: 'high', icon: 'flame-outline' },
  { name: 'Strength Training', met: 5.0, category: 'strength', intensity: 'moderate', icon: 'barbell-outline' },
  { name: 'HIIT Workout', met: 8.5, category: 'cardio', intensity: 'high', icon: 'flash-outline' },
  { name: 'Cycling', met: 7.5, category: 'cardio', intensity: 'moderate', icon: 'bicycle-outline' },
  { name: 'Brisk Walking', met: 3.8, category: 'cardio', intensity: 'low', icon: 'walk-outline' },
  { name: 'Swimming', met: 7.0, category: 'cardio', intensity: 'high', icon: 'water-outline' },
  { name: 'Yoga & Stretch', met: 3.0, category: 'flexibility', intensity: 'low', icon: 'body-outline' },
  { name: 'Boxing / Martial Arts', met: 8.5, category: 'sports', intensity: 'high', icon: 'fitness-outline' },
];

export default function AddExerciseModal({
  visible,
  onClose,
  onSave,
  userWeightKg = 75,
}) {
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [customName, setCustomName] = useState('');
  const [duration, setDuration] = useState('30');
  const [caloriesBurned, setCaloriesBurned] = useState('270');
  const [intensity, setIntensity] = useState('moderate');
  const [category, setCategory] = useState('cardio');
  const [isManualCalorie, setIsManualCalorie] = useState(false);

  // Calculates calories from MET formula: (MET * 3.5 * weightKg / 200) * durationMinutes
  const calculateMETCalories = (metVal, mins) => {
    const minsNum = Number(mins) || 0;
    const weight = Number(userWeightKg) || 75;
    const burned = Math.round(((metVal * 3.5 * weight) / 200) * minsNum);
    return String(burned);
  };

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setCustomName(preset.name);
    setCategory(preset.category);
    setIntensity(preset.intensity);
    if (!isManualCalorie) {
      setCaloriesBurned(calculateMETCalories(preset.met, duration));
    }
  };

  const handleDurationChange = (val) => {
    setDuration(val);
    if (!isManualCalorie && selectedPreset) {
      setCaloriesBurned(calculateMETCalories(selectedPreset.met, val));
    }
  };

  const handleSave = () => {
    const name = customName.trim() || selectedPreset?.name || 'Workout';
    const mins = Number(duration) || 30;
    const cals = Number(caloriesBurned) || 0;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    onSave({
      exercise_name: name,
      duration_minutes: mins,
      calories_burned: cals,
      intensity,
      category,
      timestamp: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.titleText}>Log Workout / Exercise</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Presets Grid */}
            <Text style={styles.sectionLabel}>Quick Activity Presets</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.presetScroll}
            >
              {PRESETS.map((p) => {
                const isSelected = selectedPreset?.name === p.name;
                return (
                  <TouchableOpacity
                    key={p.name}
                    style={[
                      styles.presetCard,
                      isSelected && styles.presetCardActive,
                    ]}
                    onPress={() => handleSelectPreset(p)}
                  >
                    <Ionicons
                      name={p.icon}
                      size={20}
                      color={isSelected ? colors.sageBright : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.presetText,
                        isSelected && styles.presetTextActive,
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Workout Details */}
            <Input
              label="Activity Name"
              value={customName || selectedPreset?.name || ''}
              onChangeText={setCustomName}
              placeholder="e.g. Morning Jog"
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <Input
                  label="Duration"
                  value={duration}
                  onChangeText={handleDurationChange}
                  keyboardType="numeric"
                  unit="mins"
                />
              </View>

              <View style={styles.col}>
                <Input
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
                  <TouchableOpacity
                    key={int}
                    style={[
                      styles.intensityPill,
                      isSelected && styles.intensityPillActive,
                    ]}
                    onPress={() => setIntensity(int)}
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

            <Button
              title="Log Exercise"
              onPress={handleSave}
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
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  presetScroll: {
    marginBottom: 16,
  },
  presetCard: {
    alignItems: 'center',
    backgroundColor: colors.cardElevated,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: 80,
  },
  presetCardActive: {
    borderColor: colors.sageBright,
    backgroundColor: 'rgba(107, 155, 125, 0.12)',
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  presetTextActive: {
    color: colors.sageBright,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
    marginHorizontal: 4,
  },
  intensityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  intensityPill: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
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
  saveBtn: {
    marginBottom: 20,
  },
});

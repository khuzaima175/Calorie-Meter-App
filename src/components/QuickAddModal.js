// src/components/QuickAddModal.js
// Fast manual calorie & macro logging modal

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
import { parseMealDescription } from '../services/geminiService';
import { colors, radius, typography } from '../theme/colors';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

export default function QuickAddModal({
  visible,
  onClose,
  onSave,
  initialMealType = 'snack',
  editMeal = null,
  date,
}) {
  const [mealType, setMealType] = useState(editMeal?.meal_type || initialMealType);
  const [name, setName] = useState(editMeal?.name || '');
  const [calories, setCalories] = useState(editMeal ? String(editMeal.calories) : '');
  const [protein, setProtein] = useState(editMeal?.protein ? String(editMeal.protein) : '');
  const [carbs, setCarbs] = useState(editMeal?.carbs ? String(editMeal.carbs) : '');
  const [fat, setFat] = useState(editMeal?.fat ? String(editMeal.fat) : '');
  const [portion, setPortion] = useState(editMeal?.portion || '1 serving');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);

  const session = useRef(0);
  const operationPending = useRef(false);

  // Reset form when modal opens or editMeal changes
  useEffect(() => {
    session.current++;
    operationPending.current = false;
    if (visible) {
      setMealType(editMeal?.meal_type || initialMealType || 'breakfast');
      setName(editMeal?.name || '');
      setCalories(editMeal ? String(editMeal.calories) : '');
      setProtein(editMeal?.protein ? String(editMeal.protein) : '');
      setCarbs(editMeal?.carbs ? String(editMeal.carbs) : '');
      setFat(editMeal?.fat ? String(editMeal.fat) : '');
      setPortion(editMeal?.portion || '1 serving');
      setError('');
      setIsSaving(false);
      setIsEstimating(false);
    }
    return () => { session.current++; };
  }, [visible, editMeal, initialMealType]);

  const handleEstimateNutrition = async () => {
    if (operationPending.current || isSaving || isEstimating) return;
    const request = session.current;
    const query = name.trim();
    if (!query) {
      setError('Please type a food or meal name first');
      return;
    }
    operationPending.current = true;
    setIsEstimating(true);
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const fullQuery = portion.trim() && portion.trim() !== '1 serving'
        ? `${query} (${portion.trim()})`
        : query;
      const result = await parseMealDescription(fullQuery, {
        mealPeriod: { mealType, label: mealType, timeStr: '' },
      });
      if (request !== session.current) return;
      if (result) {
        if (result.calories != null) setCalories(String(Math.round(result.calories)));
        if (result.protein != null) setProtein(String(Math.round(result.protein)));
        if (result.carbs != null) setCarbs(String(Math.round(result.carbs)));
        if (result.fat != null) setFat(String(Math.round(result.fat)));
        if (result.portion && (!portion || portion === '1 serving')) {
          setPortion(result.portion);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (err) {
      if (request !== session.current) return;
      setError(err?.message || 'Could not auto-estimate. Please check food name or enter manually.');
    } finally {
      if (request === session.current) { operationPending.current = false; setIsEstimating(false); }
    }
  };

  const handleSave = async () => {
    if (operationPending.current || isSaving || isEstimating) return;
    const request = session.current;

    if (!name.trim()) {
      setError('Please enter a meal name');
      return;
    }

    let calNum = Number(calories);
    let protNum = Number(protein);
    let carbsNum = Number(carbs);
    let fatNum = Number(fat);
    let finalPortion = portion.trim() || '1 serving';

    operationPending.current = true;
    setIsSaving(true);
    setError('');

    // If calories not entered, auto-calculate with Gemini AI on the fly
    if (calories.trim() === '') {
      try {
        const fullQuery = finalPortion && finalPortion !== '1 serving'
          ? `${name.trim()} (${finalPortion})`
          : name.trim();
        const aiResult = await parseMealDescription(fullQuery, {
          mealPeriod: { mealType, label: mealType, timeStr: '' },
        });
        if (request !== session.current) return;
        if (aiResult && Number.isFinite(aiResult.calories) && aiResult.calories >= 0) {
          calNum = Math.round(aiResult.calories);
          protNum = Math.round(aiResult.protein || 0);
          carbsNum = Math.round(aiResult.carbs || 0);
          fatNum = Math.round(aiResult.fat || 0);
          if (aiResult.portion) finalPortion = aiResult.portion;
        } else {
          setError('Could not calculate calories. Please enter calories manually.');
          operationPending.current = false; setIsSaving(false);
          return;
        }
      } catch (aiErr) {
        if (request !== session.current) return;
        setError(aiErr?.message || 'Could not auto-calculate. Please enter calories manually.');
        operationPending.current = false; setIsSaving(false);
        return;
      }
    }

    if (!Number.isFinite(calNum) || calNum < 0 || calNum > 10000) {
      setError('Please enter realistic calories (0 - 10,000)');
      operationPending.current = false; setIsSaving(false);
      return;
    }
    if (![protNum, carbsNum, fatNum].every(Number.isFinite) || protNum < 0 || protNum > 1000 || carbsNum < 0 || carbsNum > 1000 || fatNum < 0 || fatNum > 1000) {
      setError('Macros must be positive realistic numbers');
      operationPending.current = false; setIsSaving(false);
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      await onSave({
        date,
        ...(editMeal || {}),
        id: editMeal?.id,
        name: name.trim(),
        meal_type: mealType,
        calories: calNum,
        protein: protNum,
        carbs: carbsNum,
        fat: fatNum,
        portion: finalPortion,
        timestamp: editMeal?.timestamp || new Date().toISOString(),
      });

      if (request === session.current) onClose();
    } catch (err) {
      if (request !== session.current) return;
      setError(err?.message || 'Could not save meal.');
    } finally {
      if (request === session.current) { operationPending.current = false; setIsSaving(false); }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => { if (!isSaving && !isEstimating) onClose(); }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.titleText}>
              {editMeal ? 'Edit Meal' : 'Quick Log Meal'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSaving || isEstimating}
              accessibilityRole="button"
              accessibilityLabel="Close meal form"
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Meal Type Selector Pills */}
            <View style={styles.typePillRow}>
              {MEAL_TYPES.map((t) => {
                const isSelected = mealType === t.key;
                return (
                  <TouchableOpacity disabled={isSaving || isEstimating} accessibilityRole="button"
                    key={t.key}
                    style={[
                      styles.typePill,
                      isSelected && styles.typePillSelected,
                    ]}
                    onPress={() => setMealType(t.key)}
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

            {/* Inputs */}
            <Input editable={!(isSaving || isEstimating)}
              label="Meal / Food Name"
              placeholder="e.g. Scrambled Eggs & Toast"
              value={name}
              onChangeText={(t) => {
                setName(t);
                setError('');
              }}
              clearable
            />

            {/* AI Auto-Estimate Button */}
            <TouchableOpacity
              style={[
                styles.aiEstimateBtn,
                (!name.trim() || isEstimating) && styles.aiEstimateBtnDisabled,
              ]}
              onPress={handleEstimateNutrition}
              disabled={!name.trim() || isEstimating || isSaving}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Calculate calories and macros with Gemini AI"
            >
              {isEstimating ? (
                <ActivityIndicator size="small" color={colors.sageBright} style={{ marginRight: 6 }} />
              ) : (
                <Ionicons
                  name="sparkles"
                  size={15}
                  color={name.trim() ? colors.sageBright : colors.textTertiary}
                  style={{ marginRight: 6 }}
                />
              )}
              <Text
                style={[
                  styles.aiEstimateBtnText,
                  (!name.trim() || isEstimating) && styles.aiEstimateBtnTextDisabled,
                ]}
              >
                {isEstimating ? 'Estimating with Gemini AI...' : 'Auto-Calculate Macros with AI'}
              </Text>
            </TouchableOpacity>

            <Input editable={!(isSaving || isEstimating)}
              label="Portion / Size"
              placeholder="e.g. 2 eggs + 1 slice toast"
              value={portion}
              onChangeText={setPortion}
            />

            <Input editable={!(isSaving || isEstimating)}
              label="Calories (kcal) *"
              placeholder="0"
              value={calories}
              onChangeText={(t) => {
                setCalories(t);
                setError('');
              }}
              keyboardType="numeric"
              unit="kcal"
              error={error}
            />

            <View style={styles.macroInputGrid}>
              <View style={styles.macroInputCol}>
                <Input editable={!(isSaving || isEstimating)}
                  label="Protein"
                  placeholder="0"
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                  unit="g"
                />
              </View>
              <View style={styles.macroInputCol}>
                <Input editable={!(isSaving || isEstimating)}
                  label="Carbs"
                  placeholder="0"
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                  unit="g"
                />
              </View>
              <View style={styles.macroInputCol}>
                <Input editable={!(isSaving || isEstimating)}
                  label="Fat"
                  placeholder="0"
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="numeric"
                  unit="g"
                />
              </View>
            </View>

            <Button
              title={editMeal ? 'Save Changes' : 'Log Meal'}
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
  typePillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typePill: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: radius.md,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  typePillSelected: {
    backgroundColor: colors.sageBright,
    borderColor: colors.sageBright,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typePillTextSelected: {
    color: colors.textInverse,
  },
  macroInputGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroInputCol: {
    flex: 1,
    marginHorizontal: 4,
  },
  saveBtn: {
    marginTop: 10,
    marginBottom: 20,
  },
  aiEstimateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.4)',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: -6,
    marginBottom: 14,
  },
  aiEstimateBtnDisabled: {
    borderColor: colors.cardBorder,
    opacity: 0.6,
  },
  aiEstimateBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.sageBright,
  },
  aiEstimateBtnTextDisabled: {
    color: colors.textTertiary,
  },
});

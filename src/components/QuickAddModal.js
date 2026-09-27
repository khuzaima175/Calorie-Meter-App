// src/components/QuickAddModal.js
// Fast manual calorie & macro logging modal

import React, { useState, useEffect } from 'react';
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
}) {
  const [mealType, setMealType] = useState(editMeal?.meal_type || initialMealType);
  const [name, setName] = useState(editMeal?.name || '');
  const [calories, setCalories] = useState(editMeal ? String(editMeal.calories) : '');
  const [protein, setProtein] = useState(editMeal?.protein ? String(editMeal.protein) : '');
  const [carbs, setCarbs] = useState(editMeal?.carbs ? String(editMeal.carbs) : '');
  const [fat, setFat] = useState(editMeal?.fat ? String(editMeal.fat) : '');
  const [portion, setPortion] = useState(editMeal?.portion || '1 serving');
  const [error, setError] = useState('');

  // Reset form when modal opens or editMeal changes
  useEffect(() => {
    if (visible) {
      setMealType(editMeal?.meal_type || initialMealType);
      setName(editMeal?.name || '');
      setCalories(editMeal ? String(editMeal.calories) : '');
      setProtein(editMeal?.protein ? String(editMeal.protein) : '');
      setCarbs(editMeal?.carbs ? String(editMeal.carbs) : '');
      setFat(editMeal?.fat ? String(editMeal.fat) : '');
      setPortion(editMeal?.portion || '1 serving');
      setError('');
    }
  }, [visible, editMeal, initialMealType]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Please enter a meal name');
      return;
    }
    if (!calories || isNaN(Number(calories)) || Number(calories) < 0) {
      setError('Please enter valid calories');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    onSave({
      id: editMeal?.id,
      name: name.trim(),
      meal_type: mealType,
      calories: Number(calories),
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      portion: portion.trim() || '1 serving',
      timestamp: editMeal?.timestamp || new Date().toISOString(),
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
            <Text style={styles.titleText}>
              {editMeal ? 'Edit Meal' : 'Quick Log Meal'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
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
                  <TouchableOpacity
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
            <Input
              label="Meal / Food Name"
              placeholder="e.g. Scrambled Eggs & Toast"
              value={name}
              onChangeText={(t) => {
                setName(t);
                setError('');
              }}
              clearable
            />

            <Input
              label="Portion / Size"
              placeholder="e.g. 2 eggs + 1 slice toast"
              value={portion}
              onChangeText={setPortion}
            />

            <Input
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
                <Input
                  label="Protein"
                  placeholder="0"
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                  unit="g"
                />
              </View>
              <View style={styles.macroInputCol}>
                <Input
                  label="Carbs"
                  placeholder="0"
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                  unit="g"
                />
              </View>
              <View style={styles.macroInputCol}>
                <Input
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
});

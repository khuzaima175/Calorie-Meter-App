// src/components/MealSection.js
// Meal category container (Breakfast, Lunch, Dinner, Snack) with category calorie totals

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MealCard from './MealCard';
import { colors, radius, typography } from '../theme/colors';

const SECTION_CONFIG = {
  breakfast: {
    title: 'Breakfast',
    icon: 'sunny-outline',
    iconColor: '#F4A261',
  },
  lunch: {
    title: 'Lunch',
    icon: 'restaurant-outline',
    iconColor: '#81B29A',
  },
  dinner: {
    title: 'Dinner',
    icon: 'moon-outline',
    iconColor: '#7BA7BC',
  },
  snack: {
    title: 'Snacks & Bites',
    icon: 'cafe-outline',
    iconColor: '#C9956B',
  },
};

export default function MealSection({
  type = 'breakfast',
  meals = [],
  onAddPress,
  onDeleteMeal,
  onMealPress,
}) {
  const config = SECTION_CONFIG[type] || SECTION_CONFIG.snack;
  const sectionCalories = meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <View style={[styles.iconBox, { backgroundColor: `${config.iconColor}20` }]}>
            <Ionicons name={config.icon} size={16} color={config.iconColor} />
          </View>
          <Text style={styles.titleText}>{config.title}</Text>
          {sectionCalories > 0 && (
            <Text style={styles.calorieTag}>{Math.round(sectionCalories)} kcal</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => onAddPress(type)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={16} color={colors.sageBright} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Meals List */}
      {meals.length > 0 ? (
        <View style={styles.mealsList}>
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onDelete={onDeleteMeal}
              onPress={onMealPress}
            />
          ))}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.emptyCard}
          onPress={() => onAddPress(type)}
          activeOpacity={0.6}
        >
          <Text style={styles.emptyText}>No {config.title.toLowerCase()} logged yet</Text>
          <Ionicons name="add-circle-outline" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  calorieTag: {
    ...typography.caption,
    color: colors.textSecondary,
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginLeft: 8,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sageSubtle,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.sageBright,
    marginLeft: 2,
  },
  mealsList: {
    marginTop: 4,
  },
  emptyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderStyle: 'dashed',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});

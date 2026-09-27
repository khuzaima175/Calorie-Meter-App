// src/components/MealPlanCard.js
// Interactive meal plan display with recipe instructions and instant logging

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Button from './Button';
import { colors, radius, typography } from '../theme/colors';

export default function MealPlanCard({ plan, onLogMealItem }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!plan || !plan.meals) return null;

  const toggleExpand = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={styles.card}>
      {/* Plan Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={18} color={colors.sageBright} />
          <Text style={styles.dayTitle}>{plan.dayTitle || 'Custom Meal Plan'}</Text>
        </View>

        {/* Day Target Summary */}
        <View style={styles.targetRow}>
          <Text style={styles.calTotal}>{plan.totalCalories} kcal</Text>
          <Text style={styles.macroSummary}>
            • P {plan.totalProtein}g • C {plan.totalCarbs}g • F {plan.totalFat}g
          </Text>
        </View>
      </View>

      {/* Meals List */}
      <View style={styles.mealsContainer}>
        {plan.meals.map((meal, idx) => {
          const isExpanded = expandedIndex === idx;

          return (
            <View key={idx} style={styles.mealBlock}>
              <TouchableOpacity
                style={styles.mealHeader}
                onPress={() => toggleExpand(idx)}
                activeOpacity={0.7}
              >
                <View style={styles.mealLeft}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{meal.meal_type}</Text>
                  </View>
                  <Text style={styles.mealTitle} numberOfLines={1}>
                    {meal.title}
                  </Text>
                </View>

                <View style={styles.mealRight}>
                  <Text style={styles.mealCals}>{meal.calories} kcal</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textTertiary}
                  />
                </View>
              </TouchableOpacity>

              {/* Macro Pills */}
              <View style={styles.macroPillRow}>
                <View style={[styles.pill, { backgroundColor: colors.proteinBg }]}>
                  <Text style={[styles.pillText, { color: colors.protein }]}>
                    P {meal.protein}g
                  </Text>
                </View>
                <View style={[styles.pill, { backgroundColor: colors.carbsBg }]}>
                  <Text style={[styles.pillText, { color: colors.carbs }]}>
                    C {meal.carbs}g
                  </Text>
                </View>
                <View style={[styles.pill, { backgroundColor: colors.fatBg }]}>
                  <Text style={[styles.pillText, { color: colors.fat }]}>
                    F {meal.fat}g
                  </Text>
                </View>
                {meal.prepTime && (
                  <View style={[styles.pill, { backgroundColor: colors.cardElevated }]}>
                    <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
                    <Text style={[styles.pillText, { color: colors.textSecondary, marginLeft: 2 }]}>
                      {meal.prepTime}
                    </Text>
                  </View>
                )}
              </View>

              {/* Expanded details */}
              {isExpanded && (
                <View style={styles.expandedContent}>
                  {meal.ingredients && meal.ingredients.length > 0 && (
                    <View style={styles.sectionGroup}>
                      <Text style={styles.sectionLabel}>Ingredients:</Text>
                      {meal.ingredients.map((ing, iIdx) => (
                        <Text key={iIdx} style={styles.ingredientText}>
                          • {ing}
                        </Text>
                      ))}
                    </View>
                  )}

                  {meal.instructions && (
                    <View style={styles.sectionGroup}>
                      <Text style={styles.sectionLabel}>Preparation:</Text>
                      <Text style={styles.instructionsText}>{meal.instructions}</Text>
                    </View>
                  )}

                  <Button
                    title="Log This Meal"
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                      onLogMealItem?.(meal);
                    }}
                    size="sm"
                    style={styles.logMealBtn}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginVertical: 10,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 12,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 6,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.sageBright,
  },
  macroSummary: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  mealsContainer: {},
  mealBlock: {
    backgroundColor: colors.cardElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 8,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    backgroundColor: colors.sageSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginRight: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.sageBright,
    textTransform: 'uppercase',
  },
  mealTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  mealRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealCals: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 6,
  },
  macroPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginRight: 6,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionGroup: {
    marginBottom: 8,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 11,
    marginBottom: 2,
    fontWeight: '600',
  },
  ingredientText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  instructionsText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  logMealBtn: {
    marginTop: 8,
  },
});

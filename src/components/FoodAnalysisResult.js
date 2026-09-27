// src/components/FoodAnalysisResult.js
// Interactive review & edit card for AI food analysis results

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
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

export default function FoodAnalysisResult({
  analysis,
  imageUri,
  onSave,
  onCancel,
}) {
  const [name, setName] = useState(analysis?.name || '');
  const [mealType, setMealType] = useState(analysis?.meal_type || 'lunch');
  const [portion, setPortion] = useState(analysis?.portion || '1 serving');
  const [calories, setCalories] = useState(String(analysis?.calories || 0));
  const [protein, setProtein] = useState(String(analysis?.protein || 0));
  const [carbs, setCarbs] = useState(String(analysis?.carbs || 0));
  const [fat, setFat] = useState(String(analysis?.fat || 0));
  const [fiber, setFiber] = useState(String(analysis?.fiber || 0));

  const handleConfirmSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onSave({
      name: name.trim() || 'Logged Meal',
      meal_type: mealType,
      portion: portion.trim() || '1 serving',
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      fiber: Number(fiber) || 0,
      image_uri: imageUri || null,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Photo preview if available */}
      {imageUri ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} />
          {analysis?.confidence && (
            <View style={styles.confidenceBadge}>
              <Ionicons name="sparkles" size={12} color={colors.sageBright} />
              <Text style={styles.confidenceText}>
                {Math.round(analysis.confidence * 100)}% AI Match
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Main Analysis Card */}
      <View style={styles.card}>
        {/* Health Score & Tags */}
        <View style={styles.scoreRow}>
          {analysis?.health_score ? (
            <View style={styles.healthScorePill}>
              <Text style={styles.healthScoreText}>
                Health Score: <Text style={styles.scoreNum}>{analysis.health_score}/10</Text>
              </Text>
            </View>
          ) : null}

          {analysis?.dietary_tags?.map((tag, idx) => (
            <View key={idx} style={styles.tagPill}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* Meal Type Selection */}
        <Text style={styles.sectionHeading}>Meal Category</Text>
        <View style={styles.typeRow}>
          {MEAL_TYPES.map((t) => {
            const isSelected = mealType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.typePill, isSelected && styles.typePillActive]}
                onPress={() => setMealType(t.key)}
              >
                <Text
                  style={[
                    styles.typePillText,
                    isSelected && styles.typePillTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Name & Portion */}
        <Input
          label="Detected Food / Meal"
          value={name}
          onChangeText={setName}
          clearable
        />

        <Input
          label="Estimated Portion"
          value={portion}
          onChangeText={setPortion}
        />

        {/* Calorie & Macro Grids */}
        <Input
          label="Total Calories (kcal)"
          value={calories}
          onChangeText={setCalories}
          keyboardType="numeric"
          unit="kcal"
        />

        <View style={styles.macroRow}>
          <View style={styles.macroCol}>
            <Input
              label="Protein"
              value={protein}
              onChangeText={setProtein}
              keyboardType="numeric"
              unit="g"
            />
          </View>
          <View style={styles.macroCol}>
            <Input
              label="Carbs"
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="numeric"
              unit="g"
            />
          </View>
          <View style={styles.macroCol}>
            <Input
              label="Fat"
              value={fat}
              onChangeText={setFat}
              keyboardType="numeric"
              unit="g"
            />
          </View>
        </View>

        {/* Health Insights */}
        {analysis?.health_tips ? (
          <View style={styles.insightBox}>
            <View style={styles.insightHeader}>
              <Ionicons name="leaf-outline" size={16} color={colors.sageBright} />
              <Text style={styles.insightTitle}>Nutrition Insight</Text>
            </View>
            <Text style={styles.insightBody}>{analysis.health_tips}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.btnRow}>
          <Button
            title="Log to Daily Intake"
            onPress={handleConfirmSave}
            size="lg"
            style={styles.saveBtn}
          />

          <Button
            title="Discard"
            onPress={onCancel}
            variant="ghost"
            size="md"
            style={styles.cancelBtn}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  confidenceBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(18, 18, 20, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.sageBright,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginBottom: 24,
  },
  scoreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 14,
  },
  healthScorePill: {
    backgroundColor: colors.sageSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginRight: 8,
    marginBottom: 6,
  },
  healthScoreText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  scoreNum: {
    fontWeight: '700',
    color: colors.sageBright,
  },
  tagPill: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  sectionHeading: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  typePill: {
    flex: 1,
    paddingVertical: 7,
    marginHorizontal: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
  },
  typePillActive: {
    backgroundColor: colors.sageBright,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typePillTextActive: {
    color: colors.textInverse,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroCol: {
    flex: 1,
    marginHorizontal: 4,
  },
  insightBox: {
    backgroundColor: 'rgba(107, 155, 125, 0.08)',
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.2)',
    marginVertical: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.sageBright,
    marginLeft: 6,
  },
  insightBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  btnRow: {
    marginTop: 8,
  },
  saveBtn: {
    marginBottom: 8,
  },
  cancelBtn: {
    paddingVertical: 8,
  },
});

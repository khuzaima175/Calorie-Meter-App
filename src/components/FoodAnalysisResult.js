// src/components/FoodAnalysisResult.js
// Interactive review & edit card for AI food analysis results with non-food guard & retake action

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
  imageUris,
  onSave,
  onCancel,
  onSwitchToText,
}) {
  const [name, setName] = useState(analysis?.name || '');
  const [mealType, setMealType] = useState(analysis?.meal_type || 'lunch');
  const [portion, setPortion] = useState(analysis?.portion || '1 serving');
  const [calories, setCalories] = useState(String(analysis?.calories || 0));
  const [protein, setProtein] = useState(String(analysis?.protein || 0));
  const [carbs, setCarbs] = useState(String(analysis?.carbs || 0));
  const [fat, setFat] = useState(String(analysis?.fat || 0));
  const [fiber, setFiber] = useState(String(analysis?.fiber || 0));

  const isWater =
    Boolean(analysis?.is_water) ||
    (name.toLowerCase().includes('water') && !name.toLowerCase().includes('watermelon')) ||
    name.toLowerCase().includes('hydration') ||
    name.toLowerCase().includes('drinking water') ||
    name.toLowerCase().includes('glass of water');

  const detectedMl =
    analysis?.water_ml ||
    (portion.includes('ml') ? parseInt(portion.replace(/\D/g, ''), 10) : 250) ||
    250;
  const [waterMl, setWaterMl] = useState(detectedMl);

  // Non-food / empty recognition check (water is valid hydration!)
  const isNoFoodDetected =
    !isWater &&
    (!analysis?.name ||
      analysis.name.toLowerCase().includes('no food') ||
      (Number(calories) === 0 && (!name.trim() || name.toLowerCase().includes('no food'))));

  const handleConfirmSave = () => {
    if (isNoFoodDetected) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onSave({
      name: name.trim() || (isWater ? 'Glass of Water' : 'Logged Meal'),
      meal_type: mealType,
      portion: isWater ? `${waterMl} ml` : portion.trim() || '1 serving',
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      fiber: Number(fiber) || 0,
      is_water: isWater,
      water_ml: isWater ? waterMl : 0,
      image_uri: imageUri || null,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Photo preview (supports multiple photos or single) */}
      {imageUris && imageUris.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.multiImageScroll}
        >
          {imageUris.map((uri, idx) => (
            <View key={idx} style={styles.multiImageCard}>
              <Image source={{ uri }} style={styles.multiImage} resizeMode="cover" />
              <View style={styles.multiImageBadge}>
                <Text style={styles.multiImageBadgeText}>Plate {idx + 1}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : imageUri ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          {analysis?.confidence && !isNoFoodDetected ? (
            <View style={styles.confidenceBadge}>
              <Ionicons name="sparkles" size={12} color={colors.sageBright} />
              <Text style={styles.confidenceText}>
                {Math.round(analysis.confidence * 100)}% AI Match
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Non-Food / Invalid Photo Banner */}
      {isNoFoodDetected ? (
        <View style={styles.noFoodWarningBox}>
          <View style={styles.warningHeader}>
            <Ionicons name="alert-circle" size={22} color={colors.warning} />
            <Text style={styles.warningTitle}>No Food Recognized</Text>
          </View>
          <Text style={styles.warningBody}>
            The AI could not identify any edible food in this photo. Please retake the photo with your meal clearly in view.
          </Text>

          <View style={styles.warningBtnRow}>
            <Button
              title="Retake Photo"
              onPress={onCancel}
              size="md"
              style={styles.retakeBtn}
            />
            {onSwitchToText && (
              <Button
                title="Describe Instead"
                onPress={onSwitchToText}
                variant="outline"
                size="md"
                style={styles.describeBtn}
              />
            )}
          </View>
        </View>
      ) : null}

      {/* Main Analysis Card */}
      <View style={styles.card}>
        {/* Hydration / Water Detection Banner */}
        {isWater && (
          <View style={styles.hydrationCard}>
            <View style={styles.hydrationHeader}>
              <View style={styles.waterDropIcon}>
                <Ionicons name="water" size={20} color="#4EA8DE" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hydrationTitle}>Drinking Water Detected</Text>
                <Text style={styles.hydrationSub}>
                  Will automatically update your Daily Hydration Tracker on Dashboard
                </Text>
              </View>
            </View>

            <Text style={styles.waterVolumeLabel}>Select Volume:</Text>
            <View style={styles.volumeChipsRow}>
              {[150, 250, 500, 750, 1000].map((ml) => {
                const isSel = waterMl === ml;
                return (
                  <TouchableOpacity
                    key={ml}
                    style={[styles.volumeChip, isSel && styles.volumeChipActive]}
                    onPress={() => setWaterMl(ml)}
                  >
                    <Text style={[styles.volumeChipText, isSel && styles.volumeChipTextActive]}>
                      {ml}ml
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Health Score & Tags */}
        {!isNoFoodDetected && !isWater && (
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
        )}

        {/* Meal Type Selection (only for food meals) */}
        {!isWater && (
          <>
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
          </>
        )}

        {/* Name & Portion */}
        <Input
          label="Detected Item"
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
        {analysis?.health_tips && !isNoFoodDetected ? (
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
            title={
              isNoFoodDetected
                ? 'Cannot Log (No Food)'
                : isWater
                ? `Log +${waterMl}ml to Hydration Tracker`
                : 'Log to Daily Intake'
            }
            onPress={handleConfirmSave}
            disabled={isNoFoodDetected}
            size="lg"
            style={styles.saveBtn}
          />

          <Button
            title="Discard & Retake"
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
    backgroundColor: '#000',
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
  noFoodWarningBox: {
    backgroundColor: 'rgba(255, 209, 102, 0.1)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.3)',
    padding: 16,
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFD166',
    marginLeft: 8,
  },
  warningBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  warningBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retakeBtn: {
    flex: 1,
    marginRight: 8,
  },
  describeBtn: {
    flex: 1,
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
  hydrationCard: {
    backgroundColor: 'rgba(78, 168, 222, 0.12)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(78, 168, 222, 0.3)',
    padding: 14,
    marginBottom: 16,
  },
  hydrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  waterDropIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(78, 168, 222, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  hydrationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4EA8DE',
  },
  hydrationSub: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: 2,
  },
  waterVolumeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  volumeChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  volumeChip: {
    flex: 1,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  volumeChipActive: {
    backgroundColor: '#4EA8DE',
    borderColor: '#4EA8DE',
  },
  volumeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  volumeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  multiImageScroll: {
    paddingBottom: 14,
  },
  multiImageCard: {
    position: 'relative',
    marginRight: 10,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  multiImage: {
    width: 140,
    height: 140,
  },
  multiImageBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  multiImageBadgeText: {
    ...typography.micro,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

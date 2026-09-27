// src/screens/SettingsScreen.js
// Profile settings, BMR/TDEE calculations, target goal customization, database tools, and medical disclaimer

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useProfileStore, calculateMetabolism } from '../stores/useProfileStore';
import { useNutritionStore } from '../stores/useNutritionStore';
import { resetDatabaseToDemo, clearAllLogs } from '../services/databaseService';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors, radius, typography } from '../theme/colors';

const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentary', sub: 'Desk job, little movement' },
  { key: 'light', label: 'Lightly Active', sub: '1-3 light workouts/week' },
  { key: 'moderate', label: 'Moderately Active', sub: '3-5 sports/gym sessions' },
  { key: 'active', label: 'Very Active', sub: '6-7 intense workout sessions' },
];

const GOAL_TYPES = [
  { key: 'lose_weight', label: 'Lose Fat', sub: '-500 kcal deficit' },
  { key: 'maintain', label: 'Maintain', sub: 'Energy equilibrium' },
  { key: 'gain_muscle', label: 'Build Muscle', sub: '+350 kcal surplus' },
];

export default function SettingsScreen() {
  const profile = useProfileStore((s) => s.profile);
  const goals = useProfileStore((s) => s.goals);
  const bmr = useProfileStore((s) => s.bmr);
  const tdee = useProfileStore((s) => s.tdee);
  const saveProfile = useProfileStore((s) => s.saveProfile);
  const saveGoals = useProfileStore((s) => s.saveGoals);
  const refreshNutrition = useNutritionStore((s) => s.refreshData);

  // Form State
  const [name, setName] = useState(profile?.name || 'Khzuaima');
  const [gender, setGender] = useState(profile?.gender || 'male');
  const [age, setAge] = useState(String(profile?.age || 26));
  const [weightKg, setWeightKg] = useState(String(profile?.weight_kg || 75));
  const [heightCm, setHeightCm] = useState(String(profile?.height_cm || 178));
  const [activityLevel, setActivityLevel] = useState(profile?.activity_level || 'moderate');
  const [goalType, setGoalType] = useState(profile?.goal_type || 'lose_weight');

  // Goals State
  const [calories, setCalories] = useState(String(goals?.calories || 2100));
  const [protein, setProtein] = useState(String(goals?.protein || 140));
  const [carbs, setCarbs] = useState(String(goals?.carbs || 220));
  const [fat, setFat] = useState(String(goals?.fat || 65));
  const [waterMl, setWaterMl] = useState(String(goals?.water_ml || 2500));
  const [exerciseMins, setExerciseMins] = useState(String(goals?.exercise_minutes || 30));

  // Gemini API Key State
  const [apiKey, setApiKey] = useState(profile?.custom_api_key || '');
  const [showApiKey, setShowApiKey] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async (autoRecalc = false) => {
    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });

    const updatedProfile = {
      name: name.trim() || 'Explorer',
      gender,
      age: Number(age) || 25,
      weight_kg: Number(weightKg) || 70,
      height_cm: Number(heightCm) || 175,
      activity_level: activityLevel,
      goal_type: goalType,
    };

    await saveProfile(updatedProfile, autoRecalc);

    if (autoRecalc) {
      const recalc = calculateMetabolism(updatedProfile);
      setCalories(String(recalc.suggestedCalories));
      setProtein(String(recalc.suggestedProtein));
      setCarbs(String(recalc.suggestedCarbs));
      setFat(String(recalc.suggestedFat));
      setWaterMl(String(recalc.suggestedWater));
      Alert.alert('Goals Recalculated', `Updated target to ${recalc.suggestedCalories} kcal based on Mifflin-St Jeor formula.`);
    } else {
      Alert.alert('Profile Saved', 'Your personal metrics have been updated.');
    }

    setIsSaving(false);
  };

  const handleSaveGoals = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });

    await saveGoals({
      calories: Number(calories) || 2000,
      protein: Number(protein) || 140,
      carbs: Number(carbs) || 220,
      fat: Number(fat) || 65,
      water_ml: Number(waterMl) || 2500,
      exercise_minutes: Number(exerciseMins) || 30,
    });

    Alert.alert('Goals Updated', 'Your nutrition and fitness targets have been saved.');
  };

  const handleSaveApiKey = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const updatedProfile = {
      ...(profile || {}),
      name: name.trim() || 'Explorer',
      gender,
      age: Number(age) || 25,
      weight_kg: Number(weightKg) || 70,
      height_cm: Number(heightCm) || 175,
      activity_level: activityLevel,
      goal_type: goalType,
      custom_api_key: apiKey.trim(),
    };
    await saveProfile(updatedProfile, false);
    Alert.alert('API Key Saved', 'Your Gemini API key has been saved and is now active for all AI features.');
  };

  const handleResetDemoData = () => {
    Alert.alert(
      'Reset Demo Data',
      'This will reload sample meals, exercises, and hydration records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetDatabaseToDemo();
            await refreshNutrition();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
            Alert.alert('Success', 'Demo data reloaded.');
          },
        },
      ]
    );
  };

  const handleClearAllLogs = () => {
    Alert.alert(
      'Clear All Logs',
      'Are you sure you want to delete all meal logs, workout history, and water intake? Your profile goals will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All Logs',
          style: 'destructive',
          onPress: async () => {
            await clearAllLogs();
            await refreshNutrition();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
            Alert.alert('Logs Cleared', 'All logs have been removed. You have a fresh, clean slate!');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.titleText}>Profile & Goals</Text>
          <Text style={styles.subtitleText}>
            Personalized metabolism calculations and nutritional targets
          </Text>
        </View>

        {/* Metabolism Insight Card */}
        <Card style={styles.metabolismCard}>
          <View style={styles.metabolismRow}>
            <View style={styles.metabolismItem}>
              <Text style={styles.metabolismVal}>{bmr}</Text>
              <Text style={styles.metabolismUnit}>kcal/day</Text>
              <Text style={styles.metabolismLabel}>BMR (Basal)</Text>
            </View>

            <View style={styles.metaDivider} />

            <View style={styles.metabolismItem}>
              <Text style={[styles.metabolismVal, { color: colors.sageBright }]}>{tdee}</Text>
              <Text style={styles.metabolismUnit}>kcal/day</Text>
              <Text style={styles.metabolismLabel}>TDEE (Burn)</Text>
            </View>
          </View>
        </Card>

        {/* Section 1: User Profile */}
        <Text style={styles.sectionHeading}>Physical Profile</Text>
        <Card style={styles.card}>
          <Input
            label="Full Name / Nickname"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
              onPress={() => setGender('male')}
            >
              <Ionicons
                name="male-outline"
                size={16}
                color={gender === 'male' ? colors.textInverse : colors.textSecondary}
              />
              <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
                Male
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
              onPress={() => setGender('female')}
            >
              <Ionicons
                name="female-outline"
                size={16}
                color={gender === 'female' ? colors.textInverse : colors.textSecondary}
              />
              <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
                Female
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.grid3}>
            <View style={styles.col3}>
              <Input
                label="Age"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                unit="yrs"
              />
            </View>
            <View style={styles.col3}>
              <Input
                label="Weight"
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                unit="kg"
              />
            </View>
            <View style={styles.col3}>
              <Input
                label="Height"
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
                unit="cm"
              />
            </View>
          </View>

          {/* Activity Level */}
          <Text style={styles.inputLabel}>Daily Activity Level</Text>
          <View style={styles.optionList}>
            {ACTIVITY_LEVELS.map((act) => {
              const isSelected = activityLevel === act.key;
              return (
                <TouchableOpacity
                  key={act.key}
                  style={[styles.optionCard, isSelected && styles.optionCardActive]}
                  onPress={() => setActivityLevel(act.key)}
                >
                  <View>
                    <Text style={[styles.optionTitle, isSelected && styles.optionTitleActive]}>
                      {act.label}
                    </Text>
                    <Text style={styles.optionSub}>{act.sub}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.sageBright} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Goal Type */}
          <Text style={styles.inputLabel}>Fitness & Body Goal</Text>
          <View style={styles.optionList}>
            {GOAL_TYPES.map((g) => {
              const isSelected = goalType === g.key;
              return (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.optionCard, isSelected && styles.optionCardActive]}
                  onPress={() => setGoalType(g.key)}
                >
                  <View>
                    <Text style={[styles.optionTitle, isSelected && styles.optionTitleActive]}>
                      {g.label}
                    </Text>
                    <Text style={styles.optionSub}>{g.sub}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.sageBright} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Button
            title="Auto-Recalculate & Apply Goals"
            onPress={() => handleSaveProfile(true)}
            loading={isSaving}
            size="md"
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* Section 2: Custom Daily Targets */}
        <Text style={styles.sectionHeading}>Daily Nutritional Targets</Text>
        <Card style={styles.card}>
          <Input
            label="Daily Calorie Goal"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
            unit="kcal"
          />

          <View style={styles.grid3}>
            <View style={styles.col3}>
              <Input
                label="Protein"
                value={protein}
                onChangeText={setProtein}
                keyboardType="numeric"
                unit="g"
              />
            </View>
            <View style={styles.col3}>
              <Input
                label="Carbs"
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="numeric"
                unit="g"
              />
            </View>
            <View style={styles.col3}>
              <Input
                label="Fat"
                value={fat}
                onChangeText={setFat}
                keyboardType="numeric"
                unit="g"
              />
            </View>
          </View>

          <View style={styles.grid2}>
            <View style={styles.col2}>
              <Input
                label="Water Goal"
                value={waterMl}
                onChangeText={setWaterMl}
                keyboardType="numeric"
                unit="ml"
              />
            </View>
            <View style={styles.col2}>
              <Input
                label="Active Mins"
                value={exerciseMins}
                onChangeText={setExerciseMins}
                keyboardType="numeric"
                unit="mins"
              />
            </View>
          </View>

          <Button
            title="Save Custom Targets"
            onPress={handleSaveGoals}
            variant="secondary"
            size="md"
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* Section: Gemini AI Configuration */}
        <Text style={styles.sectionHeading}>Gemini AI Configuration</Text>
        <Card style={styles.card}>
          <Text style={styles.cardDesc}>
            Sage AI, Food Photo Vision, and Label OCR are powered by Google Gemini. You can paste your own Gemini API key below to override the default key.
          </Text>

          <View style={styles.apiKeyInputContainer}>
            <View style={{ flex: 1 }}>
              <Input
                label="Gemini API Key"
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="AIzaSy..."
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity
              style={styles.keyEyeBtn}
              onPress={() => setShowApiKey(!showApiKey)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showApiKey ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Button
            title="Save Gemini API Key"
            onPress={handleSaveApiKey}
            variant="primary"
            size="md"
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* Section 3: App & Data Tools */}
        <Text style={styles.sectionHeading}>Data & App Management</Text>
        <Card style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleResetDemoData}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="refresh-outline" size={20} color={colors.sageBright} />
              <Text style={styles.actionText}>Reload Demo Sample Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleClearAllLogs}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Clear All Logs (Start From Scratch)</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* Medical Disclaimer Footer */}
        <View style={styles.disclaimerContainer}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textTertiary} />
          <Text style={styles.disclaimerText}>
            CalorieSnap Pro provides nutritional estimates and AI coaching for informational purposes only. It is not intended as a substitute for professional medical advice, diagnosis, or clinical nutrition therapy.
          </Text>
          <Text style={styles.versionText}>CalorieSnap Pro v1.0.0 • Offline SQLite Engine</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 130,
  },
  header: {
    marginBottom: 16,
  },
  titleText: {
    ...typography.title2,
  },
  subtitleText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metabolismCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: colors.cardElevated,
  },
  metabolismRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metabolismItem: {
    alignItems: 'center',
  },
  metabolismVal: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metabolismUnit: {
    ...typography.micro,
    color: colors.textTertiary,
    marginTop: -2,
  },
  metabolismLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  metaDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.cardBorder,
  },
  sectionHeading: {
    ...typography.title3,
    fontSize: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: radius.md,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  genderBtnActive: {
    backgroundColor: colors.sageBright,
    borderColor: colors.sageBright,
  },
  genderText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 6,
  },
  genderTextActive: {
    color: colors.textInverse,
  },
  grid3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col3: {
    flex: 1,
    marginHorizontal: 3,
  },
  grid2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col2: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 6,
  },
  cardDesc: {
    ...typography.bodyMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  apiKeyInputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  keyEyeBtn: {
    position: 'absolute',
    right: 12,
    top: 36,
    padding: 6,
  },
  optionList: {
    marginBottom: 12,
  },
  optionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
    marginBottom: 6,
  },
  optionCardActive: {
    borderColor: colors.sageBright,
    backgroundColor: 'rgba(107, 155, 125, 0.1)',
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionTitleActive: {
    color: colors.sageBright,
  },
  optionSub: {
    ...typography.micro,
    color: colors.textTertiary,
    marginTop: 2,
    textTransform: 'none',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 10,
  },
  actionDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 8,
  },
  disclaimerContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  disclaimerText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    fontSize: 11,
  },
  versionText: {
    ...typography.micro,
    color: colors.textTertiary,
    marginTop: 12,
    fontSize: 10,
  },
});

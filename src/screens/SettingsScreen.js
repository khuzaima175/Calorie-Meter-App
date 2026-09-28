// src/screens/SettingsScreen.js
// Profile settings, BMR/TDEE calculations, target goal customization, database tools, and medical disclaimer

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Share,
  Modal,
  TextInput,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useProfileStore, calculateMetabolism } from '../stores/useProfileStore';
import { useNutritionStore } from '../stores/useNutritionStore';
import {
  resetDatabaseToDemo,
  clearAllLogs,
  factoryResetAllData,
  exportAllDataJSON,
  importAllDataJSON,
} from '../services/databaseService';
import { scheduleDailyReminders, cancelAllReminders } from '../services/notificationService';
import { testGeminiApiKey } from '../services/geminiService';
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
  const [isTestingKey, setIsTestingKey] = useState(false);

  // Notifications State
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      import('expo-notifications').then((Notifications) => {
        Notifications.getAllScheduledNotificationsAsync().then((scheduled) => {
          if (scheduled && scheduled.length > 0) {
            setNotificationsEnabled(true);
          }
        }).catch(() => {});
      }).catch(() => {});
    }
  }, []);

  const handleToggleNotifications = async (val) => {
    if (Platform.OS === 'web') {
      Alert.alert('Web Notice', 'Local push notifications are available on iOS and Android devices.');
      return;
    }
    if (val) {
      const success = await scheduleDailyReminders();
      if (success) {
        setNotificationsEnabled(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert(
          'Daily Reminders Scheduled! ⏰',
          'You will receive 4 daily notifications:\n• 8:30 AM — Breakfast Reminder\n• 1:15 PM — Lunch Photo Reminder\n• 4:30 PM — Afternoon Hydration Check\n• 7:45 PM — Dinner & Daily Review'
        );
      } else {
        setNotificationsEnabled(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        Alert.alert(
          'Permission Required',
          'Notification permission was not granted. Please enable notifications in your device settings to receive meal and hydration reminders.'
        );
      }
    } else {
      await cancelAllReminders();
      setNotificationsEnabled(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Reminders Paused', 'All scheduled meal and hydration reminders have been cancelled.');
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleExportJSON = async () => {
    try {
      const json = await exportAllDataJSON();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (Platform.OS === 'web') {
        // Web: trigger download or copy
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(json);
          Alert.alert('Backup Copied', 'Your full nutrition database backup has been copied to your clipboard!');
        } else {
          Alert.alert('Backup Generated', 'Backup JSON ready (length: ' + json.length + ' chars).');
        }
      } else {
        await Share.share({
          title: 'CalorieSnap_Backup.json',
          message: json,
        });
      }
    } catch (err) {
      Alert.alert('Export Failed', err.message || 'Could not export backup data.');
    }
  };

  const handleImportJSON = async () => {
    if (!importJsonText.trim()) {
      Alert.alert('Empty Input', 'Please paste valid JSON backup data.');
      return;
    }
    setIsImporting(true);
    try {
      const result = await importAllDataJSON(importJsonText.trim());
      await useProfileStore.getState().loadProfile();
      await refreshNutrition();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setImportModalVisible(false);
      setImportJsonText('');
      Alert.alert(
        'Import Successful! ✓',
        `Restored ${result.mealCount} meals, ${result.exerciseCount} workouts, and ${result.waterCount} hydration logs.`
      );
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('Import Failed', err.message || 'Malformed JSON backup file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFactoryReset = () => {
    Alert.alert(
      '⚠️ Factory Reset App',
      'This will permanently delete ALL meals, workouts, hydration logs, custom goals, and profile metrics. The app will return to initial install state.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Factory Reset',
          style: 'destructive',
          onPress: async () => {
            await factoryResetAllData();
            await useProfileStore.getState().loadProfile();
            await refreshNutrition();
            setName('Khzuaima');
            setGender('male');
            setAge('26');
            setWeightKg('75');
            setHeightCm('178');
            setApiKey('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            Alert.alert('Reset Complete', 'All app data has been completely erased.');
          },
        },
      ]
    );
  };

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

  const handleTestApiKey = async () => {
    const keyToTest = apiKey.trim();
    setIsTestingKey(true);
    try {
      const res = await testGeminiApiKey(keyToTest);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert(
          'API Key Valid! ✓',
          `Successfully connected to Google Gemini (${res.model}) in ${res.latencyMs}ms.\n\nYour AI food scanner, text parser, and nutrition coach are ready to go!`
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        Alert.alert('Connection Test Failed', res.error);
      }
    } catch (err) {
      Alert.alert('Test Error', err.message || 'Could not reach Gemini API.');
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSaveApiKey = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const cleanKey = apiKey.trim().replace(/\s+/g, '');
    const updatedProfile = {
      ...(profile || {}),
      name: name.trim() || 'Explorer',
      gender,
      age: Number(age) || 25,
      weight_kg: Number(weightKg) || 70,
      height_cm: Number(heightCm) || 175,
      activity_level: activityLevel,
      goal_type: goalType,
      custom_api_key: cleanKey,
    };
    await saveProfile(updatedProfile, false);
    if (cleanKey) {
      Alert.alert(
        'Gemini API Key Saved',
        `Your personal Gemini API key (${cleanKey.length} characters) is active for AI meal scanning, text parsing, and coaching.`
      );
    } else {
      Alert.alert('API Key Cleared', 'The app will now use the default shared Gemini API key.');
    }
  };

  const handleClearCustomApiKey = () => {
    Alert.alert(
      'Revert to Default Key',
      'Remove your personal Gemini API key and switch back to the built-in default key?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setApiKey('');
            const updatedProfile = {
              ...(profile || {}),
              name: name.trim() || 'Explorer',
              gender,
              age: Number(age) || 25,
              weight_kg: Number(weightKg) || 70,
              height_cm: Number(heightCm) || 175,
              activity_level: activityLevel,
              goal_type: goalType,
              custom_api_key: '',
            };
            await saveProfile(updatedProfile, false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            Alert.alert('Default Key Restored', 'The app is now using the default shared Gemini key.');
          },
        },
      ]
    );
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
            accessibilityLabel="Save Custom Targets"
            accessibilityRole="button"
          />
        </Card>

        {/* Section: Notifications & Reminders */}
        <Text style={styles.sectionHeading}>Daily Reminders & Notifications</Text>
        <Card style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.switchTitle}>Daily Logging Reminders</Text>
              <Text style={styles.switchSub}>
                Smart prompts for breakfast, lunch, hydration, and daily evening macro review.
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.cardBorder, true: colors.sageBright }}
              thumbColor={Platform.OS === 'ios' ? '#ffffff' : (notificationsEnabled ? '#ffffff' : '#888888')}
              accessibilityLabel="Toggle daily meal and water reminders"
              accessibilityRole="switch"
            />
          </View>

          {notificationsEnabled ? (
            <View style={styles.scheduleList}>
              <View style={styles.scheduleItem}>
                <Ionicons name="sunny-outline" size={16} color={colors.sageBright} />
                <Text style={styles.scheduleTime}>08:30 AM</Text>
                <Text style={styles.scheduleDesc}>Breakfast & Morning Streak</Text>
              </View>
              <View style={styles.scheduleItem}>
                <Ionicons name="restaurant-outline" size={16} color={colors.sageBright} />
                <Text style={styles.scheduleTime}>01:15 PM</Text>
                <Text style={styles.scheduleDesc}>Lunch Photo & AI Analysis</Text>
              </View>
              <View style={styles.scheduleItem}>
                <Ionicons name="water-outline" size={16} color={colors.water} />
                <Text style={styles.scheduleTime}>04:30 PM</Text>
                <Text style={styles.scheduleDesc}>Hydration Check (250ml+)</Text>
              </View>
              <View style={styles.scheduleItem}>
                <Ionicons name="moon-outline" size={16} color={colors.sageBright} />
                <Text style={styles.scheduleTime}>07:45 PM</Text>
                <Text style={styles.scheduleDesc}>Dinner & Daily Macro Review</Text>
              </View>
            </View>
          ) : null}
        </Card>

        {/* Section: Gemini AI Configuration */}
        <Text style={styles.sectionHeading}>Gemini AI Configuration</Text>
        <Card style={styles.card}>
          <Text style={styles.cardDesc}>
            Sage AI Coach, Food Vision, and Label OCR are powered by Google Gemini. Enter your own free Gemini API key below to override default shared quotas.
          </Text>

          {/* Status Badge */}
          {apiKey?.trim() ? (
            <View style={styles.keyStatusBadge}>
              <Ionicons name="checkmark-circle" size={15} color={colors.sageBright} />
              <Text style={styles.keyStatusText}>
                Custom Key Configured ({apiKey.trim().length} characters)
              </Text>
            </View>
          ) : (
            <View style={styles.keyStatusBadgeMuted}>
              <Ionicons name="information-circle-outline" size={15} color={colors.textTertiary} />
              <Text style={styles.keyStatusTextMuted}>
                Using Shared App Key (subject to shared daily quotas)
              </Text>
            </View>
          )}

          <Input
            label="Gemini API Key"
            value={apiKey}
            onChangeText={(text) => setApiKey(text.trim().replace(/\s+/g, ''))}
            placeholder="AIzaSy..."
            secureTextEntry={!showApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            selectTextOnFocus
            rightAccessory={
              <View style={styles.inputAccessoryRow}>
                {apiKey ? (
                  <TouchableOpacity
                    onPress={() => setApiKey('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.keyActionIconBtn}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  onPress={() => setShowApiKey(!showApiKey)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.keyActionIconBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showApiKey ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            }
          />

          <View style={styles.apiButtonRow}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Button
                title={isTestingKey ? 'Testing...' : 'Test Key'}
                onPress={handleTestApiKey}
                variant="secondary"
                size="md"
                loading={isTestingKey}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Button
                title="Save Key"
                onPress={handleSaveApiKey}
                variant="primary"
                size="md"
              />
            </View>
          </View>

          {profile?.custom_api_key ? (
            <TouchableOpacity
              style={styles.clearKeyLink}
              onPress={handleClearCustomApiKey}
              activeOpacity={0.7}
            >
              <Text style={styles.clearKeyLinkText}>Remove custom key & use default</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.aiStudioLink}
            onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
            activeOpacity={0.8}
          >
            <Ionicons name="open-outline" size={14} color={colors.sageBright} />
            <Text style={styles.aiStudioLinkText}>Get a free API key at Google AI Studio</Text>
          </TouchableOpacity>
        </Card>

        {/* Section 3: App & Data Tools */}
        <Text style={styles.sectionHeading}>Data & App Management</Text>
        <Card style={styles.card}>
          {/* Export JSON */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleExportJSON}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.sageBright} />
              <Text style={styles.actionText}>Export Data Backup (JSON)</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          {/* Import JSON */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setImportModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="cloud-download-outline" size={20} color={colors.sageBright} />
              <Text style={styles.actionText}>Import Data Backup (JSON)</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          {/* Reload Demo */}
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

          {/* Clear Logs */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleClearAllLogs}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="trash-outline" size={20} color={colors.caloriesBurned} />
              <Text style={[styles.actionText, { color: colors.caloriesBurned }]}>Clear All Logs (Keep Profile)</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          {/* Factory Reset */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleFactoryReset}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="warning-outline" size={20} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error, fontWeight: '700' }]}>
                Factory Reset (Wipe All Data)
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* Import JSON Modal */}
        <Modal
          visible={importModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setImportModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Import Backup JSON</Text>
                <TouchableOpacity
                  onPress={() => setImportModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Paste your previously exported CalorieSnap JSON backup below to restore your meals, exercises, and profile targets.
              </Text>

              <TextInput
                style={styles.modalTextInput}
                placeholder='Paste JSON here: {"version":1,"meals":[...]}'
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={8}
                value={importJsonText}
                onChangeText={setImportJsonText}
                textAlignVertical="top"
              />

              <View style={styles.modalBtnRow}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={() => setImportModalVisible(false)}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Button
                    title="Restore Data"
                    onPress={handleImportJSON}
                    loading={isImporting}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>

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
  keyStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 155, 125, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.3)',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  keyStatusText: {
    ...typography.caption,
    color: colors.sageBright,
    fontWeight: '600',
    marginLeft: 6,
  },
  keyStatusBadgeMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  keyStatusTextMuted: {
    ...typography.caption,
    color: colors.textTertiary,
    marginLeft: 6,
  },
  inputAccessoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyActionIconBtn: {
    padding: 6,
    marginLeft: 2,
  },
  apiButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  clearKeyLink: {
    alignSelf: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  clearKeyLinkText: {
    ...typography.caption,
    color: colors.textTertiary,
    textDecorationLine: 'underline',
  },
  aiStudioLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(107, 155, 125, 0.08)',
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.2)',
  },
  aiStudioLinkText: {
    ...typography.callout,
    color: colors.sageBright,
    fontWeight: '600',
    marginLeft: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    ...typography.title3,
    fontSize: 18,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  modalTextInput: {
    backgroundColor: colors.cardElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 13,
    height: 140,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  switchSub: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  scheduleList: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  scheduleTime: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.sageBright,
    marginLeft: 8,
    width: 68,
  },
  scheduleDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
});


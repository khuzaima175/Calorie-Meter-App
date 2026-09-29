// src/screens/ActivityScreen.js
// Fitness and Workout Tracking Screen: Active minutes, calories burned, workout history, and MET calculator

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNutritionStore } from '../stores/useNutritionStore';
import { useProfileStore } from '../stores/useProfileStore';
import DaySelector from '../components/DaySelector';
import ExerciseCard from '../components/ExerciseCard';
import AddExerciseModal from '../components/AddExerciseModal';
import Card from '../components/Card';
import Button from '../components/Button';
import { colors, radius, typography } from '../theme/colors';

export default function ActivityScreen() {
  const selectedDate = useNutritionStore((s) => s.selectedDate);
  const setSelectedDate = useNutritionStore((s) => s.setSelectedDate);
  const refreshData = useNutritionStore((s) => s.refreshData);
  const exercises = useNutritionStore((s) => s.exercises);
  const dailyTotals = useNutritionStore((s) => s.dailyTotals);
  const addExercise = useNutritionStore((s) => s.addExercise);
  const removeExercise = useNutritionStore((s) => s.removeExercise);

  const profile = useProfileStore((s) => s.profile);
  const goals = useProfileStore((s) => s.goals);
  const userWeight = Number(profile?.weight_kg) || 75;

  const QUICK_ACTIVITIES = [
    { name: 'Moderate Walk', mins: 30, met: 3.5, icon: 'walk-outline', category: 'walking', intensity: 'low' },
    { name: 'Jogging Run', mins: 20, met: 9.0, icon: 'flame-outline', category: 'cardio', intensity: 'high' },
    { name: 'Strength Gym', mins: 45, met: 5.0, icon: 'barbell-outline', category: 'strength', intensity: 'moderate' },
    { name: 'Cricket Nets', mins: 60, met: 5.0, icon: 'trophy-outline', category: 'sports', intensity: 'moderate' },
  ];

  const handleQuickLog = async (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const cals = Math.round(((item.met * 3.5 * userWeight) / 200) * item.mins);
    try {
      await addExercise({
        exercise_name: `${item.name} (${item.mins}m)`,
        duration_minutes: item.mins,
        calories_burned: cals,
        intensity: item.intensity,
        category: item.category,
        timestamp: new Date().toISOString(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      console.warn('Quick log error:', err);
    }
  };

  const walkingExercises = exercises.filter(
    (e) => (e.category === 'walking' || e.exercise_name?.toLowerCase().includes('walk') || e.exercise_name?.toLowerCase().includes('step'))
  );
  const totalWalkMins = walkingExercises.reduce((sum, e) => sum + (Number(e.duration_minutes) || 0), 0);
  const totalWalkSteps = totalWalkMins * 105;
  const totalWalkKm = Number((totalWalkMins * 0.075).toFixed(1));
  const totalWalkCals = walkingExercises.reduce((sum, e) => sum + (Number(e.calories_burned) || 0), 0);

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await refreshData(selectedDate);
    setRefreshing(false);
  }, [refreshData, selectedDate]);

  const targetMinutes = goals.exercise_minutes || 30;
  const activePercent = Math.min(100, Math.round((dailyTotals.activeMinutes / targetMinutes) * 100));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.sageBright}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.titleText} numberOfLines={1}>Activity & Workouts</Text>
            <Text style={styles.subtitleText} numberOfLines={1}>
              Track calories burned and movement
            </Text>
          </View>

          <Button
            title="+ Add Workout"
            onPress={() => setModalVisible(true)}
            size="sm"
            style={styles.addWorkoutBtn}
          />
        </View>

        {/* Date Selector Navigation */}
        <DaySelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        {/* Hero Active Minutes Metric Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.flameIconBox}>
              <Ionicons name="flame" size={24} color={colors.caloriesBurned} />
            </View>

            <View style={styles.heroStatsCol}>
              <Text style={styles.burnedValue}>
                -{dailyTotals.caloriesBurned} <Text style={styles.kcalUnit}>kcal</Text>
              </Text>
              <Text style={styles.burnedLabel}>Total Burned via Exercise</Text>
            </View>
          </View>

          {/* Active Minutes Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.activeMinsText}>
                {dailyTotals.activeMinutes} of {targetMinutes} active mins
              </Text>
              <Text style={styles.percentText}>{activePercent}%</Text>
            </View>

            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, activePercent)}%` },
                ]}
              />
            </View>
          </View>
        </Card>

        {/* Quick 1-Tap Log Shortcuts */}
        <Text style={styles.sectionHeading}>Quick 1-Tap Log</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickLogScroll}
          contentContainerStyle={styles.quickLogScrollContent}
        >
          {QUICK_ACTIVITIES.map((act, idx) => {
            const estCals = Math.round(((act.met * 3.5 * userWeight) / 200) * act.mins);
            return (
              <TouchableOpacity
                key={idx}
                style={styles.quickLogCard}
                onPress={() => handleQuickLog(act)}
                activeOpacity={0.7}
              >
                <View style={styles.quickLogIconCircle}>
                  <Ionicons name={act.icon} size={18} color={colors.sageBright} />
                </View>
                <Text style={styles.quickLogName} numberOfLines={1}>{act.name}</Text>
                <Text style={styles.quickLogMins}>{act.mins} mins</Text>
                <Text style={styles.quickLogCals}>-{estCals} kcal</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Daily Walking & Steps Progress Summary Card */}
        {totalWalkMins > 0 && (
          <Card style={styles.walkSummaryCard}>
            <View style={styles.walkSummaryHeader}>
              <View style={styles.walkIconCircle}>
                <Ionicons name="walk" size={20} color={colors.sageBright} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.walkSummaryTitle}>Today's Walking Activity</Text>
                <Text style={styles.walkSummarySub}>Based on {walkingExercises.length} logged walk session(s)</Text>
              </View>
            </View>

            <View style={styles.walkStatsGrid}>
              <View style={styles.walkStatCol}>
                <Text style={styles.walkStatVal}>{totalWalkSteps.toLocaleString()}</Text>
                <Text style={styles.walkStatLbl}>est. steps</Text>
              </View>
              <View style={styles.walkStatDivider} />
              <View style={styles.walkStatCol}>
                <Text style={styles.walkStatVal}>{totalWalkKm} km</Text>
                <Text style={styles.walkStatLbl}>distance</Text>
              </View>
              <View style={styles.walkStatDivider} />
              <View style={styles.walkStatCol}>
                <Text style={styles.walkStatVal}>{totalWalkMins}m</Text>
                <Text style={styles.walkStatLbl}>active time</Text>
              </View>
              <View style={styles.walkStatDivider} />
              <View style={styles.walkStatCol}>
                <Text style={styles.walkStatVal}>-{totalWalkCals}</Text>
                <Text style={styles.walkStatLbl}>kcal burned</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Logged Workouts List */}
        <Text style={styles.sectionHeading}>Logged Workouts</Text>

        {exercises.length > 0 ? (
          <View style={styles.exerciseList}>
            {exercises.map((item) => (
              <ExerciseCard
                key={item.id}
                exercise={item}
                onDelete={removeExercise}
              />
            ))}
          </View>
        ) : (
          <Card style={styles.emptyStateCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="barbell-outline" size={32} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No workouts logged today</Text>
            <Text style={styles.emptySubtitle}>
              Log a run, gym session, or walk to deduct burned calories from your daily balance.
            </Text>
            <Button
              title="Log Your First Workout"
              onPress={() => setModalVisible(true)}
              variant="secondary"
              size="md"
              style={{ marginTop: 14 }}
            />
          </Card>
        )}

        {/* Workout Modal */}
        <AddExerciseModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={addExercise}
          userWeightKg={profile?.weight_kg || 75}
        />
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
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  addWorkoutBtn: {
    flexShrink: 0,
    paddingHorizontal: 12,
  },
  titleText: {
    ...typography.title2,
    fontSize: 20,
  },
  subtitleText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  heroCard: {
    padding: 18,
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  flameIconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.caloriesBurnedBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroStatsCol: {
    flex: 1,
  },
  burnedValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.caloriesBurned,
    letterSpacing: -0.5,
  },
  kcalUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  burnedLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  progressContainer: {
    borderTopWidth: 1,
    borderColor: colors.cardBorder,
    paddingTop: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeMinsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.sageBright,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.cardElevated,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.sageBright,
    borderRadius: radius.full,
  },
  sectionHeading: {
    ...typography.title3,
    fontSize: 17,
    marginBottom: 10,
  },
  exerciseList: {
    marginBottom: 20,
  },
  emptyStateCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  quickLogScroll: {
    marginBottom: 16,
  },
  quickLogScrollContent: {
    paddingRight: 8,
  },
  quickLogCard: {
    backgroundColor: colors.cardElevated,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: 95,
  },
  quickLogIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(107, 155, 125, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickLogName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  quickLogMins: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickLogCals: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.caloriesBurned,
    marginTop: 4,
  },
  walkSummaryCard: {
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.3)',
  },
  walkSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  walkIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(107, 155, 125, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walkSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  walkSummarySub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  walkStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  walkStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  walkStatVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.sageBright,
  },
  walkStatLbl: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  walkStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});

// src/screens/ActivityScreen.js
// Fitness and Workout Tracking Screen: Active minutes, calories burned, workout history, and MET calculator

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNutritionStore } from '../stores/useNutritionStore';
import { useProfileStore } from '../stores/useProfileStore';
import ExerciseCard from '../components/ExerciseCard';
import AddExerciseModal from '../components/AddExerciseModal';
import Card from '../components/Card';
import Button from '../components/Button';
import { colors, radius, typography } from '../theme/colors';

export default function ActivityScreen() {
  const selectedDate = useNutritionStore((s) => s.selectedDate);
  const refreshData = useNutritionStore((s) => s.refreshData);
  const exercises = useNutritionStore((s) => s.exercises);
  const dailyTotals = useNutritionStore((s) => s.dailyTotals);
  const addExercise = useNutritionStore((s) => s.addExercise);
  const removeExercise = useNutritionStore((s) => s.removeExercise);

  const profile = useProfileStore((s) => s.profile);
  const goals = useProfileStore((s) => s.goals);

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
          <View>
            <Text style={styles.titleText}>Activity & Workouts</Text>
            <Text style={styles.subtitleText}>
              Track calories burned and daily active movement
            </Text>
          </View>

          <Button
            title="Add Workout"
            iconLeft={<Ionicons name="add" size={16} color={colors.textInverse} />}
            onPress={() => setModalVisible(true)}
            size="sm"
          />
        </View>

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

        {/* Quick Workout Category Grid */}
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
    paddingBottom: 90,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
});

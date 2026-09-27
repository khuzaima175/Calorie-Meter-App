// src/screens/DashboardScreen.js
// Central Dashboard Screen: Calorie ring, earth-tone macros, hydration, workout summary, and meal categories

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNutritionStore } from '../stores/useNutritionStore';
import { useProfileStore } from '../stores/useProfileStore';
import CalorieRing from '../components/CalorieRing';
import MacroBar from '../components/MacroBar';
import DaySelector from '../components/DaySelector';
import WaterTracker from '../components/WaterTracker';
import MealSection from '../components/MealSection';
import QuickAddModal from '../components/QuickAddModal';
import Card from '../components/Card';
import { colors, radius, typography } from '../theme/colors';

export default function DashboardScreen({ navigation }) {
  const selectedDate = useNutritionStore((s) => s.selectedDate);
  const setSelectedDate = useNutritionStore((s) => s.setSelectedDate);
  const refreshData = useNutritionStore((s) => s.refreshData);
  const meals = useNutritionStore((s) => s.meals);
  const dailyTotals = useNutritionStore((s) => s.dailyTotals);
  const addMeal = useNutritionStore((s) => s.addMeal);
  const editMeal = useNutritionStore((s) => s.editMeal);
  const removeMeal = useNutritionStore((s) => s.removeMeal);
  const logWater = useNutritionStore((s) => s.logWater);
  const undoWater = useNutritionStore((s) => s.undoWater);

  const profile = useProfileStore((s) => s.profile);
  const goals = useProfileStore((s) => s.goals);

  const [refreshing, setRefreshing] = useState(false);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState('breakfast');
  const [editingMeal, setEditingMeal] = useState(null);

  // Staggered fade-in entrance animations
  const fadeAnims = useRef([...Array(5)].map(() => new Animated.Value(0))).current;
  const slideAnims = useRef([...Array(5)].map(() => new Animated.Value(18))).current;

  useEffect(() => {
    const animations = fadeAnims.map((fade, i) =>
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 450,
          delay: i * 80,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnims[i], {
          toValue: 0,
          delay: i * 80,
          useNativeDriver: true,
          damping: 20,
          stiffness: 120,
        }),
      ])
    );
    Animated.stagger(0, animations).start();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await refreshData(selectedDate);
    setRefreshing(false);
  }, [refreshData, selectedDate]);

  const handleOpenAddForType = (type) => {
    setActiveMealType(type);
    setEditingMeal(null);
    setQuickAddVisible(true);
  };

  const handleOpenEditMeal = (meal) => {
    setEditingMeal(meal);
    setActiveMealType(meal.meal_type);
    setQuickAddVisible(true);
  };

  const handleSaveQuickMeal = async (mealData) => {
    if (mealData.id) {
      await editMeal(mealData.id, mealData);
    } else {
      await addMeal(mealData);
    }
  };

  // Group meals by category
  const breakfastMeals = meals.filter((m) => m.meal_type === 'breakfast');
  const lunchMeals = meals.filter((m) => m.meal_type === 'lunch');
  const dinnerMeals = meals.filter((m) => m.meal_type === 'dinner');
  const snackMeals = meals.filter((m) => m.meal_type === 'snack');

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

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
        {/* Header Bar */}
        <Animated.View style={{ opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingText}>
              {getGreeting()}, <Text style={styles.nameHighlight}>{profile?.name || 'Explorer'}</Text>
            </Text>
            <Text style={styles.headerSubtitle}>
              {profile?.goal_type === 'lose_weight'
                ? 'Fat Loss & Vitality'
                : profile?.goal_type === 'gain_muscle'
                ? 'Muscle Hypertrophy'
                : 'Balanced Energy'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.profileBadge}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={32} color={colors.sageBright} />
          </TouchableOpacity>
        </View>

        {/* Date Selector Navigation */}
        <DaySelector
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
        </Animated.View>

        {/* Hero Calorie & Macro Card */}
        <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
        <Card style={styles.heroCard}>
          <View style={styles.ringWrapper}>
            <CalorieRing
              consumed={dailyTotals.calories}
              goal={goals.calories}
              burned={dailyTotals.caloriesBurned}
              size={180}
            />
          </View>

          {/* Calorie Stats Breakdown */}
          <View style={styles.calorieDetailsRow}>
            <View style={styles.calDetailItem}>
              <Text style={styles.calDetailValue}>{goals.calories}</Text>
              <Text style={styles.calDetailLabel}>Base Goal</Text>
            </View>

            <View style={styles.calDivider} />

            <View style={styles.calDetailItem}>
              <Text style={[styles.calDetailValue, { color: colors.sageBright }]}>
                {dailyTotals.calories}
              </Text>
              <Text style={styles.calDetailLabel}>Food Consumed</Text>
            </View>

            <View style={styles.calDivider} />

            <View style={styles.calDetailItem}>
              <Text style={[styles.calDetailValue, { color: colors.caloriesBurned }]}>
                -{dailyTotals.caloriesBurned}
              </Text>
              <Text style={styles.calDetailLabel}>Exercise</Text>
            </View>
          </View>

          {/* Macro Progress Bars */}
          <View style={styles.macroSection}>
            <MacroBar
              protein={dailyTotals.protein}
              proteinGoal={goals.protein}
              carbs={dailyTotals.carbs}
              carbsGoal={goals.carbs}
              fat={dailyTotals.fat}
              fatGoal={goals.fat}
            />
          </View>
        </Card>
        </Animated.View>

        {/* Hydration Tracker */}
        <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }}>
        <WaterTracker
          current={dailyTotals.water}
          goal={goals.water_ml}
          onAddWater={logWater}
          onUndoWater={undoWater}
        />

        {/* Activity Shortcut Card */}
        {dailyTotals.caloriesBurned > 0 ? (
          <TouchableOpacity
            style={styles.activitySummaryCard}
            onPress={() => navigation.navigate('Activity')}
            activeOpacity={0.75}
          >
            <View style={styles.actLeft}>
              <View style={styles.actIcon}>
                <Ionicons name="flame" size={18} color={colors.caloriesBurned} />
              </View>
              <View>
                <Text style={styles.actTitle}>Today's Workouts</Text>
                <Text style={styles.actSub}>
                  {dailyTotals.activeMinutes} active minutes logged
                </Text>
              </View>
            </View>
            <View style={styles.actRight}>
              <Text style={styles.actBurn}>-{dailyTotals.caloriesBurned} kcal</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>
        ) : null}
        </Animated.View>

        {/* Meal Categories */}
        <Animated.View style={{ opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }}>
        <View style={styles.mealsHeader}>
          <Text style={styles.sectionTitle}>Today's Meals</Text>
          <TouchableOpacity
            style={styles.aiScanBanner}
            onPress={() => navigation.navigate('LogMeal')}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-outline" size={15} color={colors.sageBright} />
            <Text style={styles.aiScanText}>AI Camera / Scan</Text>
          </TouchableOpacity>
        </View>

        <MealSection
          type="breakfast"
          meals={breakfastMeals}
          onAddPress={handleOpenAddForType}
          onDeleteMeal={removeMeal}
          onMealPress={handleOpenEditMeal}
        />

        <MealSection
          type="lunch"
          meals={lunchMeals}
          onAddPress={handleOpenAddForType}
          onDeleteMeal={removeMeal}
          onMealPress={handleOpenEditMeal}
        />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[4], transform: [{ translateY: slideAnims[4] }] }}>
        <MealSection
          type="dinner"
          meals={dinnerMeals}
          onAddPress={handleOpenAddForType}
          onDeleteMeal={removeMeal}
          onMealPress={handleOpenEditMeal}
        />

        <MealSection
          type="snack"
          meals={snackMeals}
          onAddPress={handleOpenAddForType}
          onDeleteMeal={removeMeal}
          onMealPress={handleOpenEditMeal}
        />
        </Animated.View>

        {/* Quick Add Modal */}
        <QuickAddModal
          visible={quickAddVisible}
          initialMealType={activeMealType}
          editMeal={editingMeal}
          onClose={() => {
            setQuickAddVisible(false);
            setEditingMeal(null);
          }}
          onSave={handleSaveQuickMeal}
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
    paddingBottom: 130,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingText: {
    ...typography.title2,
    fontSize: 21,
  },
  nameHighlight: {
    color: colors.sageBright,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  profileBadge: {
    padding: 2,
  },
  heroCard: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  calorieDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 14,
  },
  calDetailItem: {
    alignItems: 'center',
  },
  calDetailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  calDetailLabel: {
    ...typography.micro,
    color: colors.textTertiary,
    marginTop: 2,
  },
  calDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.cardBorder,
  },
  macroSection: {
    marginTop: 4,
  },
  activitySummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 16,
  },
  actLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.caloriesBurnedBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actSub: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  actRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actBurn: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.caloriesBurned,
    marginRight: 6,
  },
  mealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    ...typography.title3,
    fontSize: 18,
  },
  aiScanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sageSubtle,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.full,
  },
  aiScanText: {
    ...typography.callout,
    color: colors.sageBright,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

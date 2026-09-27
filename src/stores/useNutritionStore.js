// src/stores/useNutritionStore.js
// High-performance Zustand store for daily nutrition, water, and exercise tracking

import { create } from 'zustand';
import {
  getTodayString,
  getMealsByDate,
  insertMeal,
  updateMeal,
  deleteMealById,
  getExercisesByDate,
  insertExercise,
  deleteExerciseById,
  getWaterIntakeByDate,
  addWaterIntake,
  removeRecentWaterIntake,
} from '../services/databaseService';

export const useNutritionStore = create((set, get) => ({
  selectedDate: getTodayString(),
  meals: [],
  exercises: [],
  waterEntries: [],
  isLoading: false,

  dailyTotals: {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    water: 0,
    caloriesBurned: 0,
    activeMinutes: 0,
    netCalories: 0,
  },

  setSelectedDate: async (date) => {
    set({ selectedDate: date });
    await get().refreshData(date);
  },

  refreshData: async (dateOverride) => {
    const targetDate = dateOverride || get().selectedDate;
    set({ isLoading: true });

    try {
      const [meals, exercises, waterEntries] = await Promise.all([
        getMealsByDate(targetDate),
        getExercisesByDate(targetDate),
        getWaterIntakeByDate(targetDate),
      ]);

      const totalCalories = meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
      const totalProtein = meals.reduce((sum, m) => sum + (Number(m.protein) || 0), 0);
      const totalCarbs = meals.reduce((sum, m) => sum + (Number(m.carbs) || 0), 0);
      const totalFat = meals.reduce((sum, m) => sum + (Number(m.fat) || 0), 0);
      const totalFiber = meals.reduce((sum, m) => sum + (Number(m.fiber) || 0), 0);
      const totalWater = waterEntries.reduce((sum, w) => sum + (Number(w.amount_ml) || 0), 0);
      const caloriesBurned = exercises.reduce((sum, e) => sum + (Number(e.calories_burned) || 0), 0);
      const activeMinutes = exercises.reduce((sum, e) => sum + (Number(e.duration_minutes) || 0), 0);

      set({
        selectedDate: targetDate,
        meals,
        exercises,
        waterEntries,
        dailyTotals: {
          calories: Math.round(totalCalories),
          protein: Math.round(totalProtein),
          carbs: Math.round(totalCarbs),
          fat: Math.round(totalFat),
          fiber: Math.round(totalFiber),
          water: Math.round(totalWater),
          caloriesBurned: Math.round(caloriesBurned),
          activeMinutes: Math.round(activeMinutes),
          netCalories: Math.round(totalCalories - caloriesBurned),
        },
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to refresh nutrition data:', error);
      set({ isLoading: false });
    }
  },

  addMeal: async (mealData) => {
    const targetDate = mealData.date || get().selectedDate;
    await insertMeal({ ...mealData, date: targetDate });
    await get().refreshData(targetDate);
  },

  editMeal: async (id, mealData) => {
    await updateMeal(id, mealData);
    await get().refreshData();
  },

  removeMeal: async (id) => {
    await deleteMealById(id);
    await get().refreshData();
  },

  logWater: async (amountMl) => {
    const targetDate = get().selectedDate;
    await addWaterIntake(amountMl, targetDate);
    await get().refreshData(targetDate);
  },

  undoWater: async () => {
    const targetDate = get().selectedDate;
    await removeRecentWaterIntake(targetDate);
    await get().refreshData(targetDate);
  },

  addExercise: async (exerciseData) => {
    const targetDate = exerciseData.date || get().selectedDate;
    await insertExercise({ ...exerciseData, date: targetDate });
    await get().refreshData(targetDate);
  },

  removeExercise: async (id) => {
    await deleteExerciseById(id);
    await get().refreshData();
  },
}));

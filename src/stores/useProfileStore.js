// src/stores/useProfileStore.js
// Zustand store for user profile, goals, and BMR/TDEE calculations

import { create } from 'zustand';
import { getProfile, updateProfile, getGoals, updateGoals, updateProfileAndGoals } from '../services/databaseService';

/**
 * Calculates BMR and TDEE using the Mifflin-St Jeor Formula
 */
export function calculateMetabolism(profile) {
  const weight = Number(profile.weight_kg) || 70;
  const height = Number(profile.height_cm) || 175;
  const age = Number(profile.age) || 25;
  const gender = profile.gender || 'male';
  const activity = profile.activity_level || 'moderate';
  const goalType = profile.goal_type || 'maintain';

  // Base BMR (Mifflin-St Jeor)
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  if (gender.toLowerCase() === 'female') {
    bmr -= 161;
  } else {
    bmr += 5;
  }

  // Activity multiplier
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const multiplier = activityMultipliers[activity] || 1.55;
  const tdee = bmr * multiplier;

  // Goal calorie adjustment
  let suggestedCalories = tdee;
  if (goalType === 'lose_weight') {
    suggestedCalories = Math.max(1200, tdee - 500); // 500 kcal deficit
  } else if (goalType === 'gain_muscle') {
    suggestedCalories = tdee + 350; // Lean surplus
  }

  // Suggested macro distribution
  // Protein: 2.0g per kg of bodyweight (or ~25-30% of calories)
  // Fat: 25-30% of total calories (9 kcal/g)
  // Carbs: Remaining calories (4 kcal/g)
  const targetCalories = Math.round(suggestedCalories);
  const targetProtein = Math.round(weight * 2.0); // 2g/kg
  const proteinCals = targetProtein * 4;
  const targetFat = Math.round((targetCalories * 0.28) / 9); // 28% fat
  const fatCals = targetFat * 9;
  const carbCals = Math.max(200, targetCalories - proteinCals - fatCals);
  const targetCarbs = Math.round(carbCals / 4);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    suggestedCalories: targetCalories,
    suggestedProtein: targetProtein,
    suggestedCarbs: targetCarbs,
    suggestedFat: targetFat,
    suggestedWater: Math.round(weight * 35), // ~35ml per kg
  };
}

export const useProfileStore = create((set, get) => ({
  profile: {
    name: 'Khzuaima',
    gender: 'male',
    age: 26,
    weight_kg: 75,
    height_cm: 178,
    activity_level: 'moderate',
    goal_type: 'lose_weight',
  },
  goals: {
    calories: 2100,
    protein: 140,
    carbs: 220,
    fat: 65,
    water_ml: 2500,
    exercise_minutes: 30,
  },
  bmr: 1720,
  tdee: 2450,
  isLoading: false,

  loadProfile: async () => {
    set({ isLoading: true });
    try {
      const [profileData, goalsData] = await Promise.all([getProfile(), getGoals()]);
      const metabolism = calculateMetabolism(profileData);

      set({
        profile: profileData,
        goals: goalsData,
        bmr: metabolism.bmr,
        tdee: metabolism.tdee,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  saveProfile: async (newProfile, autoUpdateGoals = false) => {
    try {
      newProfile = { ...get().profile, ...newProfile };
      const metabolism = calculateMetabolism(newProfile);

      if (autoUpdateGoals) {
        const newGoals = {
          calories: metabolism.suggestedCalories,
          protein: metabolism.suggestedProtein,
          carbs: metabolism.suggestedCarbs,
          fat: metabolism.suggestedFat,
          water_ml: metabolism.suggestedWater,
          exercise_minutes: 30,
        };
        await updateProfileAndGoals(newProfile, newGoals);
        set({ goals: newGoals });
      } else {
        await updateProfile(newProfile);
      }

      set({
        profile: newProfile,
        bmr: metabolism.bmr,
        tdee: metabolism.tdee,
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
      throw error;
    }
  },

  saveGoals: async (newGoals) => {
    try {
      await updateGoals(newGoals);
      set({ goals: newGoals });
    } catch (error) {
      console.error('Failed to save goals:', error);
      throw error;
    }
  },
}));

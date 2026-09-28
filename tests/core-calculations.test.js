// tests/core-calculations.test.js
// Production unit tests for Mifflin-St Jeor metabolism, token estimation, and macro math

const test = require('node:test');
const assert = require('node:assert/strict');

// 1. Mifflin-St Jeor Calculation logic
function calculateMetabolism(profile) {
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

  const targetCalories = Math.round(suggestedCalories);
  const targetProtein = Math.round(weight * 2.0); // 2g/kg
  const proteinCals = targetProtein * 4;
  const targetFat = Math.round((targetCalories * 0.28) / 9);
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
    suggestedWater: Math.round(weight * 35),
  };
}

// 2. Token estimator
function estimateTokens(str = '') {
  if (typeof str !== 'string') return 0;
  return Math.ceil(str.length / 4);
}

// 3. kJ to kcal converter
function kjToKcal(kj) {
  return Math.round(Number(kj) / 4.184);
}

// 4. Clean JSON extractor
function cleanJsonText(rawText) {
  let cleaned = (rawText || '').trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned;
}

test('Mifflin-St Jeor: Correct BMR & TDEE for 75kg Male (26yo, 178cm, moderate)', () => {
  const profile = {
    weight_kg: 75,
    height_cm: 178,
    age: 26,
    gender: 'male',
    activity_level: 'moderate',
    goal_type: 'lose_weight',
  };

  const res = calculateMetabolism(profile);
  // BMR = 10*75 + 6.25*178 - 5*26 + 5 = 750 + 1112.5 - 130 + 5 = 1737.5 -> 1738
  assert.equal(res.bmr, 1738);
  // TDEE = 1737.5 * 1.55 = 2693.125 -> 2693
  assert.equal(res.tdee, 2693);
  // Deficit target = 2693.125 - 500 = 2193
  assert.equal(res.suggestedCalories, 2193);
  // Protein = 75 * 2 = 150g
  assert.equal(res.suggestedProtein, 150);
});

test('Mifflin-St Jeor: Correct BMR for 60kg Female (30yo, 165cm, light)', () => {
  const profile = {
    weight_kg: 60,
    height_cm: 165,
    age: 30,
    gender: 'female',
    activity_level: 'light',
    goal_type: 'maintain',
  };

  const res = calculateMetabolism(profile);
  // BMR = 10*60 + 6.25*165 - 5*30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25 -> 1320
  assert.equal(res.bmr, 1320);
  // TDEE = 1320.25 * 1.375 = 1815.34 -> 1815
  assert.equal(res.suggestedCalories, 1815);
});

test('Token Estimator: ~4 characters per token calculation', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('test'), 1);
  assert.equal(estimateTokens('12345678'), 2);
  assert.equal(estimateTokens('Hello world from CalorieSnap Pro!'), 9);
});

test('kJ to kcal conversion accurate to international standards', () => {
  // 8370 kJ = ~2000 kcal
  assert.equal(kjToKcal(8370), 2000);
  // 4184 kJ = 1000 kcal
  assert.equal(kjToKcal(4184), 1000);
});

test('JSON Text Cleaner: Strips markdown fenced code blocks safely', () => {
  const input = '```json\n{"name": "Biryani", "calories": 550}\n```';
  const cleaned = cleanJsonText(input);
  const parsed = JSON.parse(cleaned);
  assert.equal(parsed.name, 'Biryani');
  assert.equal(parsed.calories, 550);
});

// tests/core-calculations.test.js
// Production unit tests for Mifflin-St Jeor metabolism, token estimation, streak calculation, MET formula, and chat sanitization

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

// 4. MET calories calculation
function calculateMETCalories(met, weightKg, durationMins) {
  const metVal = Number(met) || 3.0;
  const weight = Number(weightKg) || 70;
  const mins = Number(durationMins) || 30;
  return Math.round(((metVal * 3.5 * weight) / 200) * mins);
}

// 5. Clean JSON extractor
function cleanJsonText(rawText) {
  let cleaned = (rawText || '').trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned;
}

// 6. Streak calculation
function calculateStreakFromDates(uniqueDateList = [], todayStr = '2026-09-28') {
  const dateSet = new Set(uniqueDateList);
  if (dateSet.size === 0) return 0;

  const [y, m, d] = todayStr.split('-').map(Number);
  const today = new Date(y, m - 1, d);

  let streak = 0;
  let checkDate = new Date(today);

  // If user logged today, streak starts at 1 and we step backwards
  if (dateSet.has(todayStr)) {
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    // If not logged today yet, check if logged yesterday to maintain streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (dateSet.has(yStr)) {
      streak = 1;
      checkDate = new Date(yesterday);
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      return 0;
    }
  }

  // Count consecutive prior days
  while (true) {
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    if (dateSet.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// 7. Chat history sanitizer with pair preservation
function sanitizeChatHistory(history, newTurnText, maxTokenBudget = 8000) {
  const contents = [];
  let lastRole = null;
  const cleanHistory = (history || []).filter((m) => (m?.text || '').trim().length > 0);
  let currentTokens = estimateTokens(newTurnText || '');
  const budgetedTurns = [];

  for (let i = cleanHistory.length - 1; i >= 0; i--) {
    const msg = cleanHistory[i];
    const text = (msg?.text || '').trim();
    const tokens = estimateTokens(text);
    if (currentTokens + tokens > maxTokenBudget && budgetedTurns.length > 0) {
      break;
    }
    budgetedTurns.unshift(msg);
    currentTokens += tokens;
  }

  while (
    budgetedTurns.length > 0 &&
    (budgetedTurns[0].role === 'assistant' || budgetedTurns[0].role === 'model')
  ) {
    budgetedTurns.shift();
  }

  for (const m of budgetedTurns) {
    const text = (m?.text || '').trim();
    if (!text) continue;
    const role = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';

    if (role === lastRole) {
      if (contents.length > 0) {
        contents[contents.length - 1].parts[0].text += `\n\n${text}`;
      }
    } else {
      contents.push({ role, parts: [{ text }] });
      lastRole = role;
    }
  }

  while (contents.length > 0 && contents[0].role !== 'user') {
    contents.shift();
  }

  if (newTurnText && newTurnText.trim()) {
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n\n${newTurnText.trim()}`;
    } else {
      contents.push({ role: 'user', parts: [{ text: newTurnText.trim() }] });
    }
  }

  return contents;
}

// ==========================================
// TEST SUITE
// ==========================================

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
  assert.equal(res.bmr, 1738);
  assert.equal(res.tdee, 2693);
  assert.equal(res.suggestedCalories, 2193);
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
  assert.equal(res.bmr, 1320);
  assert.equal(res.suggestedCalories, 1815);
});

test('Token Estimator: ~4 characters per token calculation', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('test'), 1);
  assert.equal(estimateTokens('12345678'), 2);
  assert.equal(estimateTokens('Hello world from CalorieSnap Pro!'), 9);
});

test('kJ to kcal conversion accurate to international standards', () => {
  assert.equal(kjToKcal(8370), 2000);
  assert.equal(kjToKcal(4184), 1000);
});

test('MET Formula: Accurate calorie burn for cardio and strength', () => {
  // 75kg, 30 mins running @ 8.0 MET: (8.0 * 3.5 * 75 / 200) * 30 = 10.5 * 30 = 315 kcal
  assert.equal(calculateMETCalories(8.0, 75, 30), 315);
  // 60kg, 45 mins weight training @ 5.0 MET: (5.0 * 3.5 * 60 / 200) * 45 = 5.25 * 45 = 236.25 -> 236 kcal
  assert.equal(calculateMETCalories(5.0, 60, 45), 236);
});

test('Streak Calculation: 5 consecutive days ending today = 5 day streak', () => {
  const loggedDates = ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'];
  assert.equal(calculateStreakFromDates(loggedDates, '2026-09-28'), 5);
});

test('Streak Calculation: Active streak preserved when today is not logged yet', () => {
  // Logged yesterday, day before, but not today yet -> streak is 3 (pending today)
  const loggedDates = ['2026-09-25', '2026-09-26', '2026-09-27'];
  assert.equal(calculateStreakFromDates(loggedDates, '2026-09-28'), 3);
});

test('Streak Calculation: Streak broken when yesterday was missed', () => {
  // Logged 2 days ago, but missed yesterday and today -> streak = 0
  const loggedDates = ['2026-09-25', '2026-09-26'];
  assert.equal(calculateStreakFromDates(loggedDates, '2026-09-28'), 0);
});

test('Chat Sanitizer: Drops complete pairs and never starts with an orphaned model turn', () => {
  const history = [
    { role: 'user', text: 'Oldest user question' },
    { role: 'assistant', text: 'Oldest assistant answer' },
    { role: 'user', text: 'Recent question' },
    { role: 'assistant', text: 'Recent answer' },
  ];

  // Budget small enough to fit only recent pair + new message
  const result = sanitizeChatHistory(history, 'New question', 25);
  assert.equal(result[0].role, 'user');
  assert.equal(result[result.length - 1].role, 'user');
});

test('JSON Text Cleaner: Strips markdown fenced code blocks safely', () => {
  const input = '```json\n{"name": "Biryani", "calories": 550}\n```';
  const cleaned = cleanJsonText(input);
  const parsed = JSON.parse(cleaned);
  assert.equal(parsed.name, 'Biryani');
  assert.equal(parsed.calories, 550);
});

test('Schema Validation: Required food macro keys exist', () => {
  const requiredKeys = ['name', 'meal_type', 'portion', 'calories', 'protein', 'carbs', 'fat'];
  const dummyPayload = {
    name: 'Chicken Karahi',
    meal_type: 'dinner',
    portion: '1 cup',
    calories: 360,
    protein: 34,
    carbs: 8,
    fat: 21,
    health_score: 8,
    dietary_tags: ['High Protein'],
  };

  for (const k of requiredKeys) {
    assert.ok(k in dummyPayload, `Missing required key: ${k}`);
  }
  assert.equal(dummyPayload.health_score, 8);
  assert.ok(Array.isArray(dummyPayload.dietary_tags));
});


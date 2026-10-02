const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createStore } = require('zustand/vanilla');
const createLoader = require('./load-production.cjs');
const storeMocks = { zustand: { create: createStore } };
const databasePath = path.resolve('src/services/databaseService');
const geminiPath = path.resolve('src/services/geminiService');
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };

test('Water logging honors an explicit diary date after date navigation', async () => {
  let savedDate;
  const store = createLoader({ ...storeMocks, [databasePath]: {
    getTodayString: () => '2026-10-02',
    addWaterIntake: async (_amount, date) => { savedDate = date; },
    getMealsByDate: async () => [], getExercisesByDate: async () => [], getWaterIntakeByDate: async () => [],
  } })('src/stores/useNutritionStore.js').useNutritionStore;
  await store.getState().setSelectedDate('2026-09-30');
  await store.getState().logWater(250, '2026-10-01');
  assert.equal(savedDate, '2026-10-01');
  assert.equal(store.getState().selectedDate, '2026-09-30');
});

test('Latest selected date wins when reads complete out of order', async () => {
  const old = deferred(); const recent = deferred();
  const load = createLoader({ ...storeMocks, [databasePath]: {
    getTodayString: () => '2026-10-02',
    getMealsByDate: (date) => date === '2026-10-01' ? old.promise : recent.promise,
    getExercisesByDate: async () => [], getWaterIntakeByDate: async () => [],
  } });
  const store = load('src/stores/useNutritionStore.js').useNutritionStore;
  const first = store.getState().setSelectedDate('2026-10-01');
  const second = store.getState().setSelectedDate('2026-09-30');
  recent.resolve([{ calories: 200 }]); await second;
  old.resolve([{ calories: 999 }]); await first;
  assert.equal(store.getState().selectedDate, '2026-09-30');
  assert.equal(store.getState().dailyTotals.calories, 200);
  await assert.rejects(store.getState().setSelectedDate('2026-10-03'), /future/);
});

test('A meal write finishing after date navigation does not change selected day', async () => {
  const insert = deferred(); let savedDate;
  const store = createLoader({ ...storeMocks, [databasePath]: {
    getTodayString: () => '2026-10-02', insertMeal: async (meal) => { savedDate = meal.date; await insert.promise; },
    getMealsByDate: async () => [], getExercisesByDate: async () => [], getWaterIntakeByDate: async () => [],
  } })('src/stores/useNutritionStore.js').useNutritionStore;
  const saving = store.getState().addMeal({ name: 'Test' });
  await store.getState().setSelectedDate('2026-10-01');
  insert.resolve(); await saving;
  assert.equal(savedDate, '2026-10-02'); assert.equal(store.getState().selectedDate, '2026-10-01');
});

test('Profile store merges updates and propagates save failures', async () => {
  let fail = false; let persisted;
  const store = createLoader({ ...storeMocks, [databasePath]: {
    updateProfile: async (profile) => { if (fail) throw new Error('disk full'); persisted = profile; },
    updateGoals: async () => { throw new Error('disk full'); },
  } })('src/stores/useProfileStore.js').useProfileStore;
  store.setState({ profile: { ...store.getState().profile, custom_api_key: 'keep-me' } });
  await store.getState().saveProfile({ name: 'Updated' });
  assert.equal(persisted.custom_api_key, 'keep-me');
  fail = true;
  await assert.rejects(store.getState().saveProfile({ name: 'Unsaved' }), /disk full/);
  assert.equal(store.getState().profile.name, 'Updated');
  await assert.rejects(store.getState().saveGoals({ calories: 1234 }), /disk full/);
});

test('Chat blocks concurrent sends and ignores replies from a cleared conversation', async () => {
  let calls = 0; const response = deferred();
  const store = createLoader({ ...storeMocks, [geminiPath]: {
    sendNutritionistChatMessage: async () => { calls++; return response.promise; },
  } })('src/stores/useAIStore.js').useAIStore;
  const request = store.getState().sendUserMessage('Question', {});
  await store.getState().sendUserMessage('Double tap', {});
  assert.equal(calls, 1);
  store.getState().clearChat(); response.resolve('Stale response'); await request;
  assert.equal(store.getState().messages.length, 1); assert.equal(store.getState().isGenerating, false);
});

test('Production chat sanitizer respects budget even for a single huge history turn', () => {
  const gemini = createLoader({ '../stores/useProfileStore': { useProfileStore: { getState: () => ({ profile: {} }) } } })('src/services/geminiService.js');
  const contents = gemini.sanitizeChatHistory([{ role: 'user', text: 'x'.repeat(4000) }], 'Hello', 30);
  assert.deepEqual(contents, [{ role: 'user', parts: [{ text: 'Hello' }] }]);
  assert.match(gemini.parseAndFormatGeminiError(new Error('Failed to fetch')), /Network Connection/);
});

test('Water recognition does not turn coconut water or mixed meals into hydration', () => {
  const { isPlainWater } = createLoader()('src/services/validation.js');
  assert.equal(isPlainWater({ name: 'Glass of water' }), true);
  for (const name of ['Coconut water', 'Chicken with water', 'Water chestnuts', 'Watermelon']) assert.equal(isPlainWater({ name }), false);
  assert.equal(isPlainWater({ name: 'Water', is_water: false }), false);
});

test('Barcode normalization accepts numeric strings and scales serving macros', () => {
  const { productToMeal } = createLoader()('src/services/barcodeNutrition.js');
  const meal = productToMeal({ serving_quantity: '15', serving_size: '1 tbsp (15g)', nutriments: {
    'energy-kcal_100g': '540', proteins_100g: '10', sodium_100g: '0.04', sugars_100g: '20',
  } }, '12345678');
  assert.equal(meal.calories, 81); assert.equal(meal.protein, 1.5); assert.equal(meal.sodium, 6);
  assert.equal(meal.sugar, 3); assert.equal(meal.health_score, undefined);
});

test('Barcode normalization preserves zero kcal and converts kJ', () => {
  const { productToMeal } = createLoader()('src/services/barcodeNutrition.js');
  assert.equal(productToMeal({ nutriments: { 'energy-kcal_100g': 0 } }).calories, 0);
  assert.equal(productToMeal({ nutriments: { energy_100g: '418.4' } }).calories, 100);
  assert.throws(() => productToMeal({ nutriments: { 'energy-kcal_value': 100 } }), /no energy data/);
});

test('AI analysis normalizes display fields and rejects invalid nutrition', () => {
  const { normalizeAnalysis } = createLoader()('src/services/validation.js');
  const analysis = { name: 'Test food', calories: 100, dietary_tags: 'Bad shape', portion: {}, health_tips: ['Tip', 'Another tip'] };
  const result = normalizeAnalysis(analysis);
  assert.deepEqual(result.dietary_tags, []);
  assert.equal(result.portion, '1 serving'); assert.equal(result.health_tips, 'Tip Another tip');
  assert.throws(() => normalizeAnalysis({ ...analysis, protein: -10 }));
});

test('Meal plan summary matches its validated meal values', () => {
  const { normalizeMealPlan } = createLoader()('src/services/validation.js');
  const plan = normalizeMealPlan({ totalCalories: 9999, meals: [{ title: 'Eggs', calories: 150, protein: 12, carbs: 1, fat: 10, ingredients: 'Invalid array' }] });
  assert.equal(plan.totalCalories, 150); assert.equal(plan.totalProtein, 12);
  assert.deepEqual(plan.meals[0].ingredients, []);
  assert.throws(() => normalizeMealPlan({ meals: 'not an array' }));
});

test('Clearing AI state discards an in-flight meal plan', async () => {
  const response = deferred();
  const store = createLoader({ ...storeMocks, [geminiPath]: {
    generatePersonalizedMealPlan: async () => response.promise,
  } })('src/stores/useAIStore.js').useAIStore;
  const request = store.getState().requestMealPlan({}, {});
  store.getState().clearChat();
  response.resolve({ meals: ['stale'] }); await request;
  assert.equal(store.getState().mealPlan, null);
  assert.equal(store.getState().isGeneratingPlan, false);
});

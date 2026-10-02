const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const createLoader = require('./load-production.cjs');
const imagePath = path.resolve('src/services/imageService');
function webLoader(storage = new Map(), failing = { value: false }) {
  global.window = { localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => { if (failing.value) throw new Error('quota'); storage.set(key, value); },
  } };
  return createLoader({ 'react-native': { Platform: { OS: 'web' } },
    [imagePath]: { persistImageAsync: async (uri) => uri, deletePersistedImageAsync: async () => {} },
  })('src/services/databaseService.js');
}
const meal = { name: 'Test meal', meal_type: 'lunch', calories: 100, protein: 5, carbs: 10, fat: 3 };

test('Browser initialization can retry after a synchronous storage read failure', async () => {
  const storage = new Map([['caloriesnap_web_data_v1', '{broken JSON']]);
  const db = webLoader(storage);
  await assert.rejects(db.initDatabase(), /could not be read/);
  storage.clear();
  await db.initDatabase();
  assert.ok((await db.getMealsByDate(db.getTodayString())).length > 0);
});

test('Browser startup rejects invalid saved profile/goals without overwriting data', async () => {
  const storage = new Map(); const db = webLoader(storage); await db.initDatabase();
  const original = JSON.parse(await db.exportAllDataJSON());
  const corrupt = JSON.stringify({ ...original, profile: { ...original.profile, weight_kg: -10 } });
  storage.set('caloriesnap_web_data_v1', corrupt);
  const restarted = webLoader(storage);
  await assert.rejects(restarted.initDatabase(), /could not be read/);
  assert.equal(storage.get('caloriesnap_web_data_v1'), corrupt);
  storage.set('caloriesnap_web_data_v1', JSON.stringify(original));
  await restarted.initDatabase();
  assert.equal((await restarted.getProfile()).weight_kg, original.profile.weight_kg);
});

test('Clearing and factory reset remain empty after restarting', async () => {
  const storage = new Map();
  let db = webLoader(storage);
  await db.initDatabase();
  await db.clearAllLogs();
  db = webLoader(storage);
  await db.initDatabase();
  assert.equal((await db.getMealsByDate(db.getTodayString())).length, 0);
  assert.equal((await db.getExercisesByDate(db.getTodayString())).length, 0);
  await db.factoryResetAllData();
  db = webLoader(storage);
  await db.initDatabase();
  assert.equal((await db.getMealsByDate(db.getTodayString())).length, 0);
});

test('Invalid backups and unsupported versions leave existing records intact', async () => {
  const db = webLoader(); await db.initDatabase();
  const before = JSON.parse(await db.exportAllDataJSON());
  for (const backup of [{}, [], { ...before, schema_version: 3 }, { ...before, meals: [{ ...meal, date: '2026-02-30' }] }, { ...before, water_intake: [{ date: '2026-10-01', amount_ml: -5 }] }, { ...before, meals: [{ ...before.meals[0] }, { ...before.meals[0] }] }]) {
    await assert.rejects(db.importAllDataJSON(backup));
    assert.deepEqual(JSON.parse(await db.exportAllDataJSON()).meals, before.meals);
  }
});

test('Web storage quota failure rolls back memory and reports failure', async () => {
  const failing = { value: false }; const db = webLoader(new Map(), failing);
  await db.initDatabase(); const before = await db.getMealsByDate(db.getTodayString());
  failing.value = true;
  await assert.rejects(db.insertMeal(meal), /browser storage/);
  assert.deepEqual(await db.getMealsByDate(db.getTodayString()), before);
});

test('Profile updates preserve API key and goals preserve explicit zero values', async () => {
  const db = webLoader(); await db.initDatabase();
  await db.updateProfile({ ...(await db.getProfile()), custom_api_key: 'test-key' });
  await db.updateProfile({ name: 'New name' });
  assert.equal((await db.getProfile()).custom_api_key, 'test-key');
  await db.updateGoals({ ...(await db.getGoals()), protein: 0, exercise_minutes: 0 });
  assert.equal((await db.getGoals()).protein, 0);
  assert.equal((await db.getGoals()).exercise_minutes, 0);
});

test('Meal edits preserve unedited nutrients and reject invalid numbers', async () => {
  const db = webLoader(); await db.initDatabase();
  const id = await db.insertMeal({ ...meal, sodium: 100, sugar: 8, image_uri: 'https://example.com/photo.jpg' });
  await db.updateMeal(id, { name: 'Edited' });
  const updated = (await db.getMealsByDate(db.getTodayString())).find((m) => m.id === id);
  assert.equal(updated.sodium, 100); assert.equal(updated.sugar, 8); assert.equal(updated.calories, 100);
  for (const value of [Infinity, NaN, -1, 'invalid']) await assert.rejects(db.insertMeal({ ...meal, calories: value }));
  await assert.rejects(db.addWaterIntake(0));
  await assert.rejects(db.insertExercise({ exercise_name: 'Run', duration_minutes: 900, calories_burned: 100 }));
});

test('Backup round trip preserves hydration timestamps and replaces all logs', async () => {
  const db = webLoader(); await db.initDatabase();
  const backup = JSON.parse(await db.exportAllDataJSON());
  backup.water_intake[0].timestamp = '2026-09-28T06:25:00.000Z';
  await db.importAllDataJSON(backup);
  const restored = JSON.parse(await db.exportAllDataJSON());
  assert.equal(restored.water_intake[0].timestamp, backup.water_intake[0].timestamp);
  assert.equal(restored.meals.length, backup.meals.length);
});

test('Native initialization is shared and SQLite import is atomic', async () => {
  const { DatabaseSync } = require('node:sqlite');
  const sqlite = new DatabaseSync(':memory:'); let opens = 0; let failWrites = false;
  const adapter = {
    execAsync: async (sql) => sqlite.exec(sql),
    getFirstAsync: async (sql, params = []) => sqlite.prepare(sql).get(...params),
    getAllAsync: async (sql, params = []) => sqlite.prepare(sql).all(...params),
    runAsync: async (sql, params = []) => { if (failWrites && sql.startsWith('INSERT')) throw new Error('disk full'); return sqlite.prepare(sql).run(...params); },
    withExclusiveTransactionAsync: async (callback) => {
      sqlite.exec('BEGIN');
      try { await callback(adapter); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const db = createLoader({ 'react-native': { Platform: { OS: 'android' } }, 'expo-sqlite': { openDatabaseAsync: async () => { opens++; return adapter; } },
    [imagePath]: { persistImageAsync: async (uri) => uri, deletePersistedImageAsync: async () => {} },
  })('src/services/databaseService.js');
  await Promise.all([db.initDatabase(), db.initDatabase()]); assert.equal(opens, 1);
  const before = JSON.parse(await db.exportAllDataJSON());
  failWrites = true;
  await assert.rejects(db.importAllDataJSON(before), /disk full/);
  assert.deepEqual(JSON.parse(await db.exportAllDataJSON()).meals, before.meals);
  failWrites = false;
  await db.importAllDataJSON(before);
  assert.deepEqual(JSON.parse(await db.exportAllDataJSON()).water_intake.map((w) => w.timestamp), before.water_intake.map((w) => w.timestamp));
  await db.factoryResetAllData();
  assert.equal((await db.getMealsByDate(db.getTodayString())).length, 0);
  assert.equal((await db.getProfile()).custom_api_key, '');
  sqlite.close();
});

test('Recalculation saves profile and goals together or rolls both back', async () => {
  const failing = { value: false }; const db = webLoader(new Map(), failing);
  await db.initDatabase();
  const profile = { ...(await db.getProfile()), name: 'Changed' };
  const goals = { ...(await db.getGoals()), calories: 2345 };
  failing.value = true;
  await assert.rejects(db.updateProfileAndGoals(profile, goals));
  assert.notEqual((await db.getProfile()).name, 'Changed');
  assert.notEqual((await db.getGoals()).calories, 2345);
});

import { Platform } from 'react-native';
import { format, addDays, subDays } from 'date-fns';
import { persistImageAsync, deletePersistedImageAsync } from './imageService';

const IS_WEB = Platform.OS === 'web';
let SQLite = null;
if (!IS_WEB) {
  try {
    SQLite = require('expo-sqlite');
  } catch (e) {
    console.warn('Native expo-sqlite not available:', e);
  }
}

let dbInstance = null;

// Web In-Memory / LocalStorage State
const WEB_STORAGE_KEY = 'caloriesnap_web_data_v1';
let webStore = {
  meals: [],
  exercises: [],
  water_intake: [],
  goals: {
    id: 1,
    calories: 2100,
    protein: 140,
    carbs: 220,
    fat: 65,
    water_ml: 2500,
    exercise_minutes: 30,
  },
  profile: {
    id: 1,
    name: 'Khzuaima',
    gender: 'male',
    age: 26,
    weight_kg: 75,
    height_cm: 178,
    activity_level: 'moderate',
    goal_type: 'lose_weight',
  },
};

function saveWebStore() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Guard against localStorage 5MB quota overflow by omitting giant raw base64 image strings
      const safeStore = {
        ...webStore,
        meals: (webStore.meals || []).map((m) => ({
          ...m,
          image_uri: m.image_uri && m.image_uri.length > 500 ? null : m.image_uri,
        })),
      };
      window.localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(safeStore));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }
}

function loadWebStore() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const data = window.localStorage.getItem(WEB_STORAGE_KEY);
      if (data) {
        webStore = JSON.parse(data);
      }
    } catch (e) {
      console.warn('LocalStorage load failed:', e);
    }
  }
}

/**
 * Returns today's date in local 'yyyy-MM-dd' format to avoid UTC timezone cutoff bugs.
 */
export function getTodayString(offsetDays = 0) {
  const date = offsetDays === 0 ? new Date() : addDays(new Date(), offsetDays);
  return format(date, 'yyyy-MM-dd');
}

/**
 * Formats a Date object to 'yyyy-MM-dd' string
 */
export function formatDateKey(date) {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Formats a timestamp into human-readable 12-hour time 'hh:mm a'
 */
export function formatTimeString(isoString) {
  try {
    const d = isoString ? new Date(isoString) : new Date();
    return format(d, 'h:mm a');
  } catch {
    return '12:00 PM';
  }
}

/**
 * Executes schema migration with PRAGMA user_version and WAL mode for native SQLite.
 */
async function migrateDatabase(db) {
  if (IS_WEB) return;
  const versionRow = await db.getFirstAsync('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        meal_type TEXT NOT NULL DEFAULT 'snack',
        name TEXT NOT NULL,
        calories REAL NOT NULL DEFAULT 0,
        protein REAL NOT NULL DEFAULT 0,
        carbs REAL NOT NULL DEFAULT 0,
        fat REAL NOT NULL DEFAULT 0,
        fiber REAL DEFAULT 0,
        sugar REAL DEFAULT 0,
        sodium REAL DEFAULT 0,
        portion TEXT DEFAULT '1 serving',
        image_uri TEXT
      );

      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        exercise_name TEXT NOT NULL,
        duration_minutes REAL NOT NULL,
        calories_burned REAL NOT NULL,
        intensity TEXT DEFAULT 'moderate',
        category TEXT DEFAULT 'cardio'
      );

      CREATE TABLE IF NOT EXISTS water_intake (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        amount_ml REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY DEFAULT 1,
        calories REAL NOT NULL DEFAULT 2000,
        protein REAL NOT NULL DEFAULT 140,
        carbs REAL NOT NULL DEFAULT 220,
        fat REAL NOT NULL DEFAULT 65,
        water_ml REAL NOT NULL DEFAULT 2500,
        exercise_minutes REAL NOT NULL DEFAULT 30
      );

      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY DEFAULT 1,
        name TEXT DEFAULT 'Fitness Explorer',
        gender TEXT DEFAULT 'male',
        age INTEGER DEFAULT 28,
        weight_kg REAL DEFAULT 74,
        height_cm REAL DEFAULT 178,
        activity_level TEXT DEFAULT 'moderate',
        goal_type TEXT DEFAULT 'lose_weight'
      );

      CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
      CREATE INDEX IF NOT EXISTS idx_exercises_date ON exercises(date);
      CREATE INDEX IF NOT EXISTS idx_water_date ON water_intake(date);

      INSERT OR IGNORE INTO goals (id, calories, protein, carbs, fat, water_ml, exercise_minutes) 
      VALUES (1, 2100, 140, 220, 65, 2500, 30);

      INSERT OR IGNORE INTO profile (id, name, gender, age, weight_kg, height_cm, activity_level, goal_type) 
      VALUES (1, 'Khzuaima', 'male', 26, 75, 178, 'moderate', 'lose_weight');
    `);

    await db.execAsync('PRAGMA user_version = 1');
  }

  if (currentVersion < 2) {
    try {
      await db.execAsync(`
        ALTER TABLE profile ADD COLUMN custom_api_key TEXT DEFAULT '';
      `);
    } catch {}
    await db.execAsync('PRAGMA user_version = 2');
  }
}

/**
 * Initializes and returns the SQLite database singleton instance.
 */
export async function initDatabase() {
  if (IS_WEB) {
    loadWebStore();
    await seedDemoDataIfEmpty();
    return null;
  }

  if (!dbInstance) {
    try {
      dbInstance = await SQLite.openDatabaseAsync('caloriesnap.db');
      await migrateDatabase(dbInstance);
      await seedDemoDataIfEmpty();
    } catch (err) {
      console.warn('Native SQLite init fallback to web store:', err);
      loadWebStore();
      await seedDemoDataIfEmpty();
    }
  }
  return dbInstance;
}

/**
 * Helper to ensure db is initialized before query execution
 */
async function getDB() {
  if (IS_WEB) return null;
  if (!dbInstance) {
    await initDatabase();
  }
  return dbInstance;
}

// ----------------------------------------------------
// MEALS CRUD
// ----------------------------------------------------

export async function getMealsByDate(date) {
  if (IS_WEB || !dbInstance) {
    return webStore.meals.filter((m) => m.date === date).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
  const db = await getDB();
  return await db.getAllAsync(
    'SELECT * FROM meals WHERE date = ? ORDER BY timestamp ASC',
    [date]
  );
}

export async function insertMeal(meal) {
  const date = meal.date || getTodayString();
  const timestamp = meal.timestamp || new Date().toISOString();
  const meal_type = meal.meal_type || 'snack';
  const name = meal.name || 'Untitled Meal';
  const calories = Number(meal.calories) || 0;
  const protein = Number(meal.protein) || 0;
  const carbs = Number(meal.carbs) || 0;
  const fat = Number(meal.fat) || 0;
  const fiber = Number(meal.fiber) || 0;
  const sugar = Number(meal.sugar) || 0;
  const sodium = Number(meal.sodium) || 0;
  const portion = meal.portion || '1 serving';
  const image_uri = await persistImageAsync(meal.image_uri || null);

  if (IS_WEB || !dbInstance) {
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const newMeal = {
      id: newId,
      date,
      timestamp,
      meal_type,
      name,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sugar,
      sodium,
      portion,
      image_uri,
    };
    webStore.meals.push(newMeal);
    saveWebStore();
    return newId;
  }

  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO meals (date, timestamp, meal_type, name, calories, protein, carbs, fat, fiber, sugar, sodium, portion, image_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [date, timestamp, meal_type, name, calories, protein, carbs, fat, fiber, sugar, sodium, portion, image_uri]
  );
  return result.lastInsertRowId;
}

export async function updateMeal(id, meal) {
  if (IS_WEB || !dbInstance) {
    const idx = webStore.meals.findIndex((m) => m.id === id);
    if (idx !== -1) {
      webStore.meals[idx] = { ...webStore.meals[idx], ...meal };
      saveWebStore();
    }
    return;
  }

  const db = await getDB();
  return await db.runAsync(
    `UPDATE meals 
     SET meal_type = ?, name = ?, calories = ?, protein = ?, carbs = ?, fat = ?, fiber = ?, sugar = ?, sodium = ?, portion = ?, image_uri = ?
     WHERE id = ?`,
    [
      meal.meal_type,
      meal.name,
      Number(meal.calories) || 0,
      Number(meal.protein) || 0,
      Number(meal.carbs) || 0,
      Number(meal.fat) || 0,
      Number(meal.fiber) || 0,
      Number(meal.sugar) || 0,
      Number(meal.sodium) || 0,
      meal.portion || '1 serving',
      meal.image_uri || null,
      id,
    ]
  );
}

export async function deleteMealById(id) {
  if (IS_WEB || !dbInstance) {
    const mealToDelete = webStore.meals.find((m) => m.id === id);
    if (mealToDelete?.image_uri) {
      await deletePersistedImageAsync(mealToDelete.image_uri);
    }
    webStore.meals = webStore.meals.filter((m) => m.id !== id);
    saveWebStore();
    return;
  }
  const db = await getDB();
  const mealToDelete = await db.getFirstAsync('SELECT image_uri FROM meals WHERE id = ?', [id]);
  if (mealToDelete?.image_uri) {
    await deletePersistedImageAsync(mealToDelete.image_uri);
  }
  return await db.runAsync('DELETE FROM meals WHERE id = ?', [id]);
}

// ----------------------------------------------------
// EXERCISES CRUD
// ----------------------------------------------------

export async function getExercisesByDate(date) {
  if (IS_WEB || !dbInstance) {
    return webStore.exercises.filter((e) => e.date === date).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
  const db = await getDB();
  return await db.getAllAsync(
    'SELECT * FROM exercises WHERE date = ? ORDER BY timestamp ASC',
    [date]
  );
}

export async function insertExercise(exercise) {
  const date = exercise.date || getTodayString();
  const timestamp = exercise.timestamp || new Date().toISOString();
  const exercise_name = exercise.exercise_name || 'Workout';
  const duration_minutes = Number(exercise.duration_minutes) || 0;
  const calories_burned = Number(exercise.calories_burned) || 0;
  const intensity = exercise.intensity || 'moderate';
  const category = exercise.category || 'cardio';

  if (IS_WEB || !dbInstance) {
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    webStore.exercises.push({
      id: newId,
      date,
      timestamp,
      exercise_name,
      duration_minutes,
      calories_burned,
      intensity,
      category,
    });
    saveWebStore();
    return newId;
  }

  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO exercises (date, timestamp, exercise_name, duration_minutes, calories_burned, intensity, category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [date, timestamp, exercise_name, duration_minutes, calories_burned, intensity, category]
  );
  return result.lastInsertRowId;
}

export async function deleteExerciseById(id) {
  if (IS_WEB || !dbInstance) {
    webStore.exercises = webStore.exercises.filter((e) => e.id !== id);
    saveWebStore();
    return;
  }
  const db = await getDB();
  return await db.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
}

// ----------------------------------------------------
// WATER INTAKE CRUD
// ----------------------------------------------------

export async function getWaterIntakeByDate(date) {
  if (IS_WEB || !dbInstance) {
    return webStore.water_intake.filter((w) => w.date === date).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
  const db = await getDB();
  return await db.getAllAsync(
    'SELECT * FROM water_intake WHERE date = ? ORDER BY timestamp ASC',
    [date]
  );
}

export async function addWaterIntake(amountMl, date = getTodayString()) {
  const timestamp = new Date().toISOString();
  const amount = Number(amountMl) || 250;

  if (IS_WEB || !dbInstance) {
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    webStore.water_intake.push({
      id: newId,
      date,
      timestamp,
      amount_ml: amount,
    });
    saveWebStore();
    return newId;
  }

  const db = await getDB();
  return await db.runAsync(
    'INSERT INTO water_intake (date, timestamp, amount_ml) VALUES (?, ?, ?)',
    [date, timestamp, amount]
  );
}

export async function removeRecentWaterIntake(date = getTodayString()) {
  if (IS_WEB || !dbInstance) {
    const dateEntries = webStore.water_intake.filter((w) => w.date === date);
    if (dateEntries.length > 0) {
      const lastId = dateEntries[dateEntries.length - 1].id;
      webStore.water_intake = webStore.water_intake.filter((w) => w.id !== lastId);
      saveWebStore();
    }
    return;
  }

  const db = await getDB();
  const lastEntry = await db.getFirstAsync(
    'SELECT id FROM water_intake WHERE date = ? ORDER BY id DESC LIMIT 1',
    [date]
  );
  if (lastEntry?.id) {
    return await db.runAsync('DELETE FROM water_intake WHERE id = ?', [lastEntry.id]);
  }
}

// ----------------------------------------------------
// GOALS & PROFILE (Singletons)
// ----------------------------------------------------

export async function getGoals() {
  if (IS_WEB || !dbInstance) {
    return webStore.goals;
  }
  const db = await getDB();
  const row = await db.getFirstAsync('SELECT * FROM goals WHERE id = 1');
  return (
    row || {
      id: 1,
      calories: 2100,
      protein: 140,
      carbs: 220,
      fat: 65,
      water_ml: 2500,
      exercise_minutes: 30,
    }
  );
}

export async function updateGoals(goals) {
  const updated = {
    id: 1,
    calories: Number(goals.calories) || 2000,
    protein: Number(goals.protein) || 140,
    carbs: Number(goals.carbs) || 220,
    fat: Number(goals.fat) || 65,
    water_ml: Number(goals.water_ml) || 2500,
    exercise_minutes: Number(goals.exercise_minutes) || 30,
  };

  if (IS_WEB || !dbInstance) {
    webStore.goals = updated;
    saveWebStore();
    return;
  }

  const db = await getDB();
  return await db.runAsync(
    `UPDATE goals 
     SET calories = ?, protein = ?, carbs = ?, fat = ?, water_ml = ?, exercise_minutes = ?
     WHERE id = 1`,
    [
      updated.calories,
      updated.protein,
      updated.carbs,
      updated.fat,
      updated.water_ml,
      updated.exercise_minutes,
    ]
  );
}

export async function getProfile() {
  if (IS_WEB || !dbInstance) {
    return webStore.profile;
  }
  const db = await getDB();
  const row = await db.getFirstAsync('SELECT * FROM profile WHERE id = 1');
  return (
    row || {
      id: 1,
      name: 'Khzuaima',
      gender: 'male',
      age: 26,
      weight_kg: 75,
      height_cm: 178,
      activity_level: 'moderate',
      goal_type: 'lose_weight',
      custom_api_key: '',
    }
  );
}

export async function updateProfile(profile) {
  const updated = {
    id: 1,
    name: profile.name || 'User',
    gender: profile.gender || 'male',
    age: Number(profile.age) || 25,
    weight_kg: Number(profile.weight_kg) || 70,
    height_cm: Number(profile.height_cm) || 175,
    activity_level: profile.activity_level || 'moderate',
    goal_type: profile.goal_type || 'maintain',
    custom_api_key: profile.custom_api_key !== undefined ? profile.custom_api_key : '',
  };

  if (IS_WEB || !dbInstance) {
    webStore.profile = updated;
    saveWebStore();
    return;
  }

  const db = await getDB();
  return await db.runAsync(
    `UPDATE profile 
     SET name = ?, gender = ?, age = ?, weight_kg = ?, height_cm = ?, activity_level = ?, goal_type = ?, custom_api_key = ?
     WHERE id = 1`,
    [
      updated.name,
      updated.gender,
      updated.age,
      updated.weight_kg,
      updated.height_cm,
      updated.activity_level,
      updated.goal_type,
      updated.custom_api_key,
    ]
  );
}

// ----------------------------------------------------
// SEEDING DEMO DATA
// ----------------------------------------------------

export async function seedDemoDataIfEmpty() {
  const today = getTodayString();
  const yesterday = getTodayString(-1);
  const dayBefore = getTodayString(-2);

  if (IS_WEB || !dbInstance) {
    if (webStore.meals && webStore.meals.length > 0) return;

    webStore.meals = [
      { id: 1, date: today, timestamp: `${today}T08:30:00.000Z`, meal_type: 'breakfast', name: 'Avocado Sourdough Toast & Poached Egg', calories: 420, protein: 18, carbs: 38, fat: 22, fiber: 7, sugar: 2, sodium: 380, portion: '2 slices' },
      { id: 2, date: today, timestamp: `${today}T13:15:00.000Z`, meal_type: 'lunch', name: 'Grilled Lemon-Herb Salmon Bowl with Quinoa', calories: 640, protein: 48, carbs: 52, fat: 28, fiber: 8, sugar: 4, sodium: 490, portion: '1 bowl (400g)' },
      { id: 3, date: today, timestamp: `${today}T16:45:00.000Z`, meal_type: 'snack', name: 'Greek Yogurt with Blueberries & Honey', calories: 190, protein: 15, carbs: 24, fat: 3, fiber: 2, sugar: 18, sodium: 65, portion: '1 cup (180g)' },
      { id: 4, date: yesterday, timestamp: `${yesterday}T08:45:00.000Z`, meal_type: 'breakfast', name: 'Rolled Oats with Almond Butter & Banana', calories: 480, protein: 16, carbs: 68, fat: 18, fiber: 9, sugar: 14, sodium: 120, portion: '1 bowl' },
      { id: 5, date: yesterday, timestamp: `${yesterday}T13:00:00.000Z`, meal_type: 'lunch', name: 'Mediterranean Chicken Salad Wrap', calories: 580, protein: 42, carbs: 45, fat: 24, fiber: 6, sugar: 5, sodium: 620, portion: '1 wrap' },
    ];

    webStore.exercises = [
      { id: 1, date: today, timestamp: `${today}T07:15:00.000Z`, exercise_name: 'Morning HIIT Interval Run', duration_minutes: 35, calories_burned: 340, intensity: 'high', category: 'cardio' },
      { id: 2, date: yesterday, timestamp: `${yesterday}T18:00:00.000Z`, exercise_name: 'Full Body Strength & Hypertrophy', duration_minutes: 50, calories_burned: 290, intensity: 'moderate', category: 'strength' },
    ];

    webStore.water_intake = [
      { id: 1, date: today, timestamp: `${today}T08:00:00.000Z`, amount_ml: 500 },
      { id: 2, date: today, timestamp: `${today}T10:30:00.000Z`, amount_ml: 250 },
      { id: 3, date: today, timestamp: `${today}T13:30:00.000Z`, amount_ml: 500 },
      { id: 4, date: today, timestamp: `${today}T15:45:00.000Z`, amount_ml: 250 },
    ];

    saveWebStore();
    return;
  }

  const db = await getDB();
  const mealCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM meals');
  if (mealCount?.count > 0) return;

  await db.execAsync(`
    INSERT INTO meals (date, timestamp, meal_type, name, calories, protein, carbs, fat, fiber, sugar, sodium, portion) VALUES
    ('${today}', '${today}T08:30:00.000Z', 'breakfast', 'Avocado Sourdough Toast & Poached Egg', 420, 18, 38, 22, 7, 2, 380, '2 slices'),
    ('${today}', '${today}T13:15:00.000Z', 'lunch', 'Grilled Lemon-Herb Salmon Bowl with Quinoa', 640, 48, 52, 28, 8, 4, 490, '1 bowl (400g)'),
    ('${today}', '${today}T16:45:00.000Z', 'snack', 'Greek Yogurt with Blueberries & Honey', 190, 15, 24, 3, 2, 18, 65, '1 cup (180g)'),
    ('${yesterday}', '${yesterday}T08:45:00.000Z', 'breakfast', 'Rolled Oats with Almond Butter & Banana', 480, 16, 68, 18, 9, 14, 120, '1 bowl'),
    ('${yesterday}', '${yesterday}T13:00:00.000Z', 'lunch', 'Mediterranean Chicken Salad Wrap', 580, 42, 45, 24, 6, 5, 620, '1 wrap');

    INSERT INTO exercises (date, timestamp, exercise_name, duration_minutes, calories_burned, intensity, category) VALUES
    ('${today}', '${today}T07:15:00.000Z', 'Morning HIIT Interval Run', 35, 340, 'high', 'cardio'),
    ('${yesterday}', '${yesterday}T18:00:00.000Z', 'Full Body Strength & Hypertrophy', 50, 290, 'moderate', 'strength');

    INSERT INTO water_intake (date, timestamp, amount_ml) VALUES
    ('${today}', '${today}T08:00:00.000Z', 500),
    ('${today}', '${today}T10:30:00.000Z', 250),
    ('${today}', '${today}T13:30:00.000Z', 500),
    ('${today}', '${today}T15:45:00.000Z', 250);
  `);
}

export async function resetDatabaseToDemo() {
  if (IS_WEB || !dbInstance) {
    webStore.meals = [];
    webStore.exercises = [];
    webStore.water_intake = [];
    await seedDemoDataIfEmpty();
    return;
  }
  const db = await getDB();
  await db.execAsync(`
    DELETE FROM meals;
    DELETE FROM exercises;
    DELETE FROM water_intake;
    DELETE FROM goals;
    DELETE FROM profile;
    PRAGMA user_version = 0;
  `);
  await migrateDatabase(db);
  await seedDemoDataIfEmpty();
}

/**
 * Factory Reset: Completely wipes all meals, exercises, water records, and custom profiles.
 * Restores virgin state without loading demo data.
 */
export async function factoryResetAllData() {
  if (IS_WEB || !dbInstance) {
    webStore = {
      meals: [],
      exercises: [],
      water_intake: [],
      goals: { ...DEFAULT_GOALS },
      profile: { ...DEFAULT_PROFILE },
    };
    saveWebStore();
    return;
  }
  const db = await getDB();
  await db.execAsync(`
    DELETE FROM meals;
    DELETE FROM exercises;
    DELETE FROM water_intake;
    DELETE FROM goals;
    DELETE FROM profile;
    PRAGMA user_version = 0;
  `);
  await migrateDatabase(db);
}

/**
 * Clears all meal logs, workout history, and water intake to start from a completely clean slate.
 */
export async function clearAllLogs() {
  if (IS_WEB || !dbInstance) {
    webStore.meals = [];
    webStore.exercises = [];
    webStore.water_intake = [];
    saveWebStore();
    return;
  }
  const db = await getDB();
  await db.execAsync(`
    DELETE FROM meals;
    DELETE FROM exercises;
    DELETE FROM water_intake;
  `);
}

/**
 * Exports all database records as a structured JSON backup
 */
export async function exportAllDataJSON() {
  if (IS_WEB || !dbInstance) {
    return JSON.stringify(
      {
        schema_version: 2,
        app: 'CalorieSnap Pro',
        exportedAt: new Date().toISOString(),
        profile: webStore.profile,
        goals: webStore.goals,
        meals: webStore.meals,
        exercises: webStore.exercises,
        water_intake: webStore.water_intake,
        notes: 'Image URIs reference local device storage. To preserve image media across new physical devices, re-attach photos after restore.',
      },
      null,
      2
    );
  }

  const db = await getDB();
  const profile = await db.getFirstAsync('SELECT * FROM profile WHERE id = 1');
  const goals = await db.getFirstAsync('SELECT * FROM goals WHERE id = 1');
  const meals = await db.getAllAsync('SELECT * FROM meals ORDER BY timestamp ASC');
  const exercises = await db.getAllAsync('SELECT * FROM exercises ORDER BY timestamp ASC');
  const water_intake = await db.getAllAsync('SELECT * FROM water_intake ORDER BY timestamp ASC');

  return JSON.stringify(
    {
      schema_version: 2,
      app: 'CalorieSnap Pro',
      exportedAt: new Date().toISOString(),
      profile,
      goals,
      meals,
      exercises,
      water_intake,
      notes: 'Image URIs reference local device storage. To preserve image media across new physical devices, re-attach photos after restore.',
    },
    null,
    2
  );
}

/**
 * Imports database records from a structured JSON backup with schema-version normalization
 */
export async function importAllDataJSON(jsonString) {
  let parsed;
  try {
    parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
  } catch (err) {
    throw new Error('Invalid JSON format. Please provide a valid backup file.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Malformed backup object.');
  }

  const schemaVersion = parsed.schema_version || parsed.version || 1;

  if (IS_WEB || !dbInstance) {
    if (parsed.profile) {
      webStore.profile = {
        ...DEFAULT_PROFILE,
        ...parsed.profile,
        custom_api_key: parsed.profile.custom_api_key || '',
      };
    }
    if (parsed.goals) {
      webStore.goals = {
        ...DEFAULT_GOALS,
        ...parsed.goals,
      };
    }
    if (Array.isArray(parsed.meals)) {
      webStore.meals = parsed.meals.map((m) => ({
        id: m.id || Date.now() + Math.floor(Math.random() * 1000),
        date: m.date || getTodayString(),
        timestamp: m.timestamp || new Date().toISOString(),
        meal_type: m.meal_type || 'snack',
        name: m.name || 'Imported Meal',
        calories: Number(m.calories) || 0,
        protein: Number(m.protein) || 0,
        carbs: Number(m.carbs) || 0,
        fat: Number(m.fat) || 0,
        fiber: Number(m.fiber) || 0,
        sugar: Number(m.sugar) || 0,
        sodium: Number(m.sodium) || 0,
        portion: m.portion || '1 serving',
        image_uri: m.image_uri || null,
      }));
    }
    if (Array.isArray(parsed.exercises)) {
      webStore.exercises = parsed.exercises.map((e) => ({
        id: e.id || Date.now() + Math.floor(Math.random() * 1000),
        date: e.date || getTodayString(),
        timestamp: e.timestamp || new Date().toISOString(),
        exercise_name: e.exercise_name || 'Workout',
        duration_minutes: Number(e.duration_minutes) || 0,
        calories_burned: Number(e.calories_burned) || 0,
        intensity: e.intensity || 'moderate',
        category: e.category || 'cardio',
      }));
    }
    if (Array.isArray(parsed.water_intake)) {
      webStore.water_intake = parsed.water_intake.map((w) => ({
        id: w.id || Date.now() + Math.floor(Math.random() * 1000),
        date: w.date || getTodayString(),
        timestamp: w.timestamp || new Date().toISOString(),
        amount_ml: Number(w.amount_ml) || 250,
      }));
    }
    saveWebStore();
    return {
      schemaVersion,
      mealCount: webStore.meals.length,
      exerciseCount: webStore.exercises.length,
      waterCount: webStore.water_intake.length,
    };
  }

  const db = await getDB();

  // Clean existing tables
  await db.execAsync(`
    DELETE FROM meals;
    DELETE FROM exercises;
    DELETE FROM water_intake;
  `);

  if (parsed.profile) {
    await saveProfile({
      ...DEFAULT_PROFILE,
      ...parsed.profile,
      custom_api_key: parsed.profile.custom_api_key || '',
    });
  }
  if (parsed.goals) {
    await saveGoals({
      ...DEFAULT_GOALS,
      ...parsed.goals,
    });
  }

  let mealCount = 0;
  if (Array.isArray(parsed.meals)) {
    for (const m of parsed.meals) {
      await insertMeal({
        date: m.date || getTodayString(),
        timestamp: m.timestamp || new Date().toISOString(),
        meal_type: m.meal_type || 'snack',
        name: m.name || 'Imported Meal',
        calories: Number(m.calories) || 0,
        protein: Number(m.protein) || 0,
        carbs: Number(m.carbs) || 0,
        fat: Number(m.fat) || 0,
        fiber: Number(m.fiber) || 0,
        sugar: Number(m.sugar) || 0,
        sodium: Number(m.sodium) || 0,
        portion: m.portion || '1 serving',
        image_uri: m.image_uri || null,
      });
      mealCount++;
    }
  }

  let exerciseCount = 0;
  if (Array.isArray(parsed.exercises)) {
    for (const e of parsed.exercises) {
      await insertExercise({
        date: e.date || getTodayString(),
        timestamp: e.timestamp || new Date().toISOString(),
        exercise_name: e.exercise_name || 'Workout',
        duration_minutes: Number(e.duration_minutes) || 0,
        calories_burned: Number(e.calories_burned) || 0,
        intensity: e.intensity || 'moderate',
        category: e.category || 'cardio',
      });
      exerciseCount++;
    }
  }

  let waterCount = 0;
  if (Array.isArray(parsed.water_intake)) {
    for (const w of parsed.water_intake) {
      await addWaterIntake(Number(w.amount_ml) || 250, w.date || getTodayString());
      waterCount++;
    }
  }

  return { schemaVersion, mealCount, exerciseCount, waterCount };
}

/**
 * Computes 7-day nutritional summary up to endDate
 */
export async function get7DaySummary(endDate = getTodayString()) {
  const dates = [];
  const [year, month, day] = endDate.split('-').map(Number);
  const endDateTime = new Date(year, month - 1, day);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(endDateTime);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  const summary = [];
  for (const d of dates) {
    const daily = await getDailySummary(d);
    summary.push({
      date: d,
      calories: daily.totals.calories,
      caloriesBurned: daily.totals.caloriesBurned,
      netCalories: daily.totals.netCalories,
      protein: daily.totals.protein,
      carbs: daily.totals.carbs,
      fat: daily.totals.fat,
      waterMl: daily.totals.waterMl,
    });
  }

  return summary;
}


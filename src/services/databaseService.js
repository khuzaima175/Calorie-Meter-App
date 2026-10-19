import { numberInRange, validateDate, validateMeal, validateExercise, validateProfile, validateGoals, validateBackup } from './validation';
import { Platform } from 'react-native';
import { format, addDays, subDays } from 'date-fns';
import { persistImageAsync, deletePersistedImageAsync } from './imageService';
import { notifyDataReplacement } from './dataLifecycle';

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
let initialization = null;
let initialized = false;
let committedWebStore = null;

// Web In-Memory / LocalStorage State
const WEB_STORAGE_KEY = 'caloriesnap_web_data_v1';

export const DEFAULT_GOALS = {
  id: 1,
  calories: 2100,
  protein: 140,
  carbs: 220,
  fat: 65,
  water_ml: 2500,
  exercise_minutes: 30,
};

export const DEFAULT_PROFILE = {
  id: 1,
  name: 'Khzuaima',
  gender: 'male',
  age: 26,
  weight_kg: 75,
  height_cm: 178,
  activity_level: 'moderate',
  goal_type: 'lose_weight',
  custom_api_key: '',
};

let webStore = {
  meals: [],
  exercises: [],
  water_intake: [],
  goals: { ...DEFAULT_GOALS },
  profile: { ...DEFAULT_PROFILE },
  settings: {},
  scan_jobs: [],
  scan_receipts: [],
};

function saveWebStore() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Guard against localStorage 5MB quota overflow by omitting giant raw base64 image strings
      const safeStore = {
        ...webStore,
        meals: (webStore.meals || []).map((m) => ({
          ...m,
          image_uri: m.image_uri?.startsWith('data:') ? null : m.image_uri,
        })),
      };
      window.localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(safeStore));
      committedWebStore = JSON.stringify(webStore);
    } catch (e) {
      if (committedWebStore) webStore = JSON.parse(committedWebStore);
      throw new Error('Could not save data in browser storage. Free some space and try again.');
    }
  }
}

function loadWebStore() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const data = window.localStorage.getItem(WEB_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        validateBackup({ ...parsed, schema_version: 2 });
        webStore = { settings: {}, scan_jobs: [], scan_receipts: [], ...parsed, profile: validateProfile({ ...DEFAULT_PROFILE, ...parsed.profile }), goals: validateGoals({ ...DEFAULT_GOALS, ...parsed.goals }) };
        committedWebStore = JSON.stringify(webStore);
        return true;
      }
    } catch (e) {
      throw new Error('Saved browser data could not be read. Restore a valid backup or check browser storage access.');
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
    const columns = await db.getAllAsync('PRAGMA table_info(profile)');
    if (!columns.some((column) => column.name === 'custom_api_key')) {
      await db.execAsync(`
        ALTER TABLE profile ADD COLUMN custom_api_key TEXT DEFAULT '';
      `);
    }
    await db.execAsync('PRAGMA user_version = 2');
  }
  if (currentVersion < 3) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      const columns = await tx.getAllAsync('PRAGMA table_info(meals)');
      if (!columns.some((column) => column.name === 'metadata')) await tx.execAsync("ALTER TABLE meals ADD COLUMN metadata TEXT DEFAULT '{}'");
      if (!columns.some((column) => column.name === 'thumbnail_uri')) await tx.execAsync('ALTER TABLE meals ADD COLUMN thumbnail_uri TEXT');
      await tx.execAsync(`
        CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS scan_jobs (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS scan_receipts (id TEXT PRIMARY KEY);
        PRAGMA user_version = 3;
      `);
    });
  }
}

/**
 * Initializes and returns the SQLite database singleton instance.
 */
export async function initDatabase() {
  if (initialized) return dbInstance;
  if (initialization) return initialization;
  // Defer synchronous browser reads until the shared promise is assigned.
  // Otherwise an early storage exception can leave a rejected promise cached.
  initialization = Promise.resolve().then(async () => {
    try {
      if (IS_WEB) {
        const hasSavedData = loadWebStore();
        if (!hasSavedData) saveWebStore();
      } else {
        if (!SQLite) throw new Error('SQLite is unavailable on this device.');
        dbInstance = await SQLite.openDatabaseAsync('caloriesnap.db');
        const version = await dbInstance.getFirstAsync('PRAGMA user_version');
        await migrateDatabase(dbInstance);
        // New diaries start empty. Demo records remain an explicit Settings action.
      }
      initialized = true;
      return dbInstance;
    } catch (error) {
      dbInstance = null;
      throw error;
    } finally { initialization = null; }
  });
  return initialization;
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

const parseMetadata = (value) => {
  try { return typeof value === 'string' ? JSON.parse(value) : value || {}; } catch { return {}; }
};
export function mealMetadata(meal) {
  const previous = parseMetadata(meal.metadata);
  const strings = (value) => Array.isArray(value) ? value.filter((s) => typeof s === 'string').slice(0, 40) : [];
  return { ...previous,
    image_uris: strings(meal.image_uris || previous.image_uris || (meal.image_uri ? [meal.image_uri] : [])),
    ingredients: strings(meal.ingredients || previous.ingredients),
    dietary_tags: strings(meal.dietary_tags || previous.dietary_tags),
    health_tips: typeof (meal.health_tips ?? previous.health_tips) === 'string' ? (meal.health_tips ?? previous.health_tips).slice(0, 4000) : '',
    health_score: Number(meal.health_score ?? previous.health_score) || 0,
  };
}
const decodeMeal = (meal) => ({ ...meal, ...parseMetadata(meal.metadata) });

export async function getSetting(key, fallback = null) {
  await initDatabase();
  if (IS_WEB) return webStore.settings?.[key] ?? fallback;
  const row = await dbInstance.getFirstAsync('SELECT value FROM app_settings WHERE key=?', [key]);
  try { return row ? JSON.parse(row.value) : fallback; } catch { return fallback; }
}
export async function setSetting(key, value) {
  await initDatabase();
  if (typeof key !== 'string' || !/^[a-z_]{1,64}$/.test(key)) throw new Error('Invalid setting key.');
  const encoded = JSON.stringify(value);
  if (!encoded || encoded.length > 16384) throw new Error('Invalid setting value.');
  if (IS_WEB) { webStore.settings = { ...webStore.settings, [key]: value }; saveWebStore(); }
  else await dbInstance.runAsync('INSERT OR REPLACE INTO app_settings (key,value) VALUES (?,?)', [key, encoded]);
}

export async function listScanJobs() {
  await initDatabase();
  if (IS_WEB) return JSON.parse(JSON.stringify(webStore.scan_jobs || []));
  return (await dbInstance.getAllAsync('SELECT payload FROM scan_jobs ORDER BY rowid')).map((r) => JSON.parse(r.payload));
}
export async function putScanJob(job) {
  await initDatabase();
  validateDate(job.date);
  if (typeof job.id !== 'string' || job.id.length > 128 || !['photo','label','text','barcode'].includes(job.kind) ||
    !['queued','analyzing','ready','failed'].includes(job.status) || !Array.isArray(job.photos) || job.photos.length > 4) throw new Error('Invalid scan draft.');
  const photos = job.photos.map((p) => {
    if (typeof p.uri !== 'string' || /^(data|blob):/.test(p.uri)) throw new Error('Save the photo before queuing this scan.');
    return { uri: p.uri, mimeType: p.mimeType || 'image/jpeg', prepared: Boolean(p.prepared) };
  });
  const saved = { id: job.id, kind: job.kind, date: job.date, createdAt: job.createdAt,
    status: job.status, stage: job.stage, photos, thumbnailUri: job.thumbnailUri || null,
    text: String(job.text || '').slice(0, 6000), context: { userNote: String(job.context?.userNote || '').slice(0, 4000), mealPeriod: job.context?.mealPeriod },
    result: job.result || null, draft: job.draft || null, error: job.error || null };
  if (IS_WEB) { webStore.scan_jobs = [...(webStore.scan_jobs || []).filter((j) => j.id !== job.id), saved]; saveWebStore(); }
  else await dbInstance.runAsync('INSERT OR REPLACE INTO scan_jobs (id,payload) VALUES (?,?)', [job.id, JSON.stringify(saved)]);
}
export async function deleteScanJob(id) {
  await initDatabase();
  if (IS_WEB) { webStore.scan_jobs = (webStore.scan_jobs || []).filter((j) => j.id !== id); saveWebStore(); }
  else await dbInstance.runAsync('DELETE FROM scan_jobs WHERE id=?', [id]);
}

const referencedImages = (record) => [record.image_uri, record.thumbnail_uri, ...mealMetadata(record).image_uris].filter(Boolean);
export async function cleanupUnreferencedImages(uris) {
  await initDatabase();
  const deferred = await getSetting('image_cleanup_queue', []);
  const candidates = [...new Set([...(Array.isArray(deferred) ? deferred : []), ...(uris || [])])].filter(Boolean);
  if (!candidates.length) return;
  // Read both owner sets in one snapshot: saving a scan transfers its media to a meal.
  let meals, jobs;
  if (IS_WEB) { meals = webStore.meals; jobs = webStore.scan_jobs || []; }
  else {
    const owners = await dbInstance.getAllAsync('SELECT image_uri,thumbnail_uri,metadata,NULL AS payload FROM meals UNION ALL SELECT NULL,NULL,NULL,payload FROM scan_jobs');
    meals = owners.filter((row) => row.payload === null);
    jobs = owners.filter((row) => row.payload !== null).map((row) => JSON.parse(row.payload));
  }
  const references = new Set([...meals.flatMap(referencedImages), ...jobs.flatMap((j) => [...j.photos.map((p) => p.uri), j.thumbnailUri].filter(Boolean))]);
  const failed = [];
  await Promise.all(candidates.filter((uri) => !references.has(uri)).map(async (uri) => {
    try { await deletePersistedImageAsync(uri); } catch { failed.push(uri); }
  }));
  if (deferred.length || failed.length) await setSetting('image_cleanup_queue', failed.slice(-32)).catch(() => {});
}

export async function completeScanJob(job, edited) {
  await initDatabase();
  const date = validateDate(job.date), timestamp = job.createdAt;
  const food = edited.is_water ? null : validateMeal({ ...job.result, ...edited, date });
  const water = edited.is_water ? numberInRange(edited.water_ml, 'Water volume', 1, 10000) : null;
  const image_uri = job.photos[0]?.uri || edited.image_uri || null;
  const metadata = food ? mealMetadata({ ...food, image_uri, image_uris: job.photos.map((p) => p.uri) }) : null;
  if (IS_WEB) {
    if ((webStore.scan_receipts || []).includes(job.id)) return;
    if (!(webStore.scan_jobs || []).some((j) => j.id === job.id && j.status === 'ready')) throw new Error('This scan is no longer available.');
    const id = Date.now() + Math.floor(Math.random() * 1000);
    if (food) webStore.meals.push({ ...food, id, date, timestamp, image_uri, metadata, thumbnail_uri: job.thumbnailUri || null });
    else webStore.water_intake.push({ id, date, timestamp, amount_ml: water });
    webStore.scan_receipts = [...(webStore.scan_receipts || []), job.id];
    webStore.scan_jobs = webStore.scan_jobs.filter((j) => j.id !== job.id);
    saveWebStore();
    return;
  }
  await dbInstance.withExclusiveTransactionAsync(async (tx) => {
    if (await tx.getFirstAsync('SELECT id FROM scan_receipts WHERE id=?', [job.id])) return;
    const stored = await tx.getFirstAsync('SELECT payload FROM scan_jobs WHERE id=?', [job.id]);
    if (!stored || JSON.parse(stored.payload).status !== 'ready') throw new Error('This scan is no longer available.');
    if (food) await tx.runAsync('INSERT INTO meals (date,timestamp,meal_type,name,calories,protein,carbs,fat,fiber,sugar,sodium,portion,image_uri,metadata,thumbnail_uri) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [date,timestamp,food.meal_type,food.name,food.calories,food.protein,food.carbs,food.fat,food.fiber,food.sugar,food.sodium,food.portion || '1 serving',image_uri,JSON.stringify(metadata),job.thumbnailUri || null]);
    else await tx.runAsync('INSERT INTO water_intake (date,timestamp,amount_ml) VALUES (?,?,?)', [date,timestamp,water]);
    await tx.runAsync('INSERT INTO scan_receipts (id) VALUES (?)', [job.id]);
    await tx.runAsync('DELETE FROM scan_jobs WHERE id=?', [job.id]);
  });
}

// ----------------------------------------------------
// MEALS CRUD
// ----------------------------------------------------

export async function getMealsByDate(date) {
  await initDatabase();
  if (IS_WEB || !dbInstance) {
    return webStore.meals.filter((m) => m.date === date).sort((a, b) => a.timestamp.localeCompare(b.timestamp)).map(decodeMeal);
  }
  const db = await getDB();
  return (await db.getAllAsync(
    'SELECT * FROM meals WHERE date = ? ORDER BY timestamp ASC',
    [date]
  )).map(decodeMeal);
}

export async function insertMeal(meal) {
  await initDatabase();
  meal = validateMeal({ ...meal, meal_type: meal.meal_type || 'snack' });
  const date = validateDate(meal.date || getTodayString());
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
  const metadata = mealMetadata({ ...meal, image_uri });
  try {
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
      metadata,
      thumbnail_uri: meal.thumbnail_uri || null,
    };
    webStore.meals.push(newMeal);
    saveWebStore();
    return newId;
  }

  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO meals (date, timestamp, meal_type, name, calories, protein, carbs, fat, fiber, sugar, sodium, portion, image_uri, metadata, thumbnail_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [date, timestamp, meal_type, name, calories, protein, carbs, fat, fiber, sugar, sodium, portion, image_uri, JSON.stringify(metadata), meal.thumbnail_uri || null]
  );
  return result.lastInsertRowId;
  } catch (error) {
    await cleanupUnreferencedImages([image_uri]).catch(() => {});
    throw error;
  }
}

export async function updateMeal(id, meal) {
  await initDatabase();
  const existing = IS_WEB ? webStore.meals.find((m) => m.id === id) : await dbInstance.getFirstAsync('SELECT * FROM meals WHERE id = ?', [id]);
  if (!existing) throw new Error('This meal no longer exists.');
  const imageChanged = Object.hasOwn(meal, 'image_uri') && meal.image_uri !== existing.image_uri;
  meal = validateMeal({ ...existing, ...meal });
  meal.image_uri = await persistImageAsync(meal.image_uri || null);
  if (imageChanged) {
    meal.image_uris = [meal.image_uri, ...mealMetadata(existing).image_uris.filter((uri) => uri !== existing.image_uri)].filter(Boolean);
    meal.thumbnail_uri = null;
  }
  meal.metadata = mealMetadata(meal);
  try {
  if (IS_WEB || !dbInstance) {
    const idx = webStore.meals.findIndex((m) => m.id === id);
    if (idx !== -1) {
      webStore.meals[idx] = { ...webStore.meals[idx], ...meal };
      saveWebStore();
    }
    await cleanupUnreferencedImages(referencedImages(existing));
    return;
  }

  const db = await getDB();
  const result = await db.runAsync(
    `UPDATE meals 
     SET meal_type = ?, name = ?, calories = ?, protein = ?, carbs = ?, fat = ?, fiber = ?, sugar = ?, sodium = ?, portion = ?, image_uri = ?, metadata = ?, thumbnail_uri = ?
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
      JSON.stringify(meal.metadata),
      meal.thumbnail_uri || null,
      id,
    ]
  );
  await cleanupUnreferencedImages(referencedImages(existing));
  return result;
  } catch (error) {
    await cleanupUnreferencedImages([meal.image_uri]).catch(() => {});
    throw error;
  }
}

export async function deleteMealById(id) {
  await initDatabase();
  if (IS_WEB || !dbInstance) {
    const mealToDelete = webStore.meals.find((m) => m.id === id);
    webStore.meals = webStore.meals.filter((m) => m.id !== id);
    saveWebStore();
    if (mealToDelete) await cleanupUnreferencedImages(referencedImages(mealToDelete));
    return;
  }
  const db = await getDB();
  const mealToDelete = await db.getFirstAsync('SELECT image_uri,thumbnail_uri,metadata FROM meals WHERE id = ?', [id]);
  const result = await db.runAsync('DELETE FROM meals WHERE id = ?', [id]);
  if (mealToDelete) await cleanupUnreferencedImages(referencedImages(mealToDelete));
  return result;
}

// ----------------------------------------------------
// EXERCISES CRUD
// ----------------------------------------------------

export async function getExercisesByDate(date) {
  await initDatabase();
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
  await initDatabase();
  exercise = validateExercise(exercise);
  const date = validateDate(exercise.date || getTodayString());
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
  await initDatabase();
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
  await initDatabase();
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
  await initDatabase();
  const timestamp = new Date().toISOString();
  validateDate(date);
  const amount = numberInRange(amountMl, 'Water volume', 1, 10000);

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
  await initDatabase();
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
  await initDatabase();
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
  await initDatabase();
  goals = validateGoals(goals);
  const updated = {
    id: 1,
    calories: Number(goals.calories) || 2000,
    protein: goals.protein,
    carbs: goals.carbs,
    fat: goals.fat,
    water_ml: Number(goals.water_ml) || 2500,
    exercise_minutes: goals.exercise_minutes,
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
  await initDatabase();
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
  await initDatabase();
  profile = validateProfile({ ...(await getProfile()), ...profile });
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

export async function updateProfileAndGoals(profile, goals) {
  await initDatabase();
  const p = validateProfile({ ...(await getProfile()), ...profile });
  const g = validateGoals(goals);
  if (IS_WEB) {
    webStore.profile = p;
    webStore.goals = g;
    saveWebStore();
    return;
  }
  await dbInstance.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('UPDATE profile SET name=?,gender=?,age=?,weight_kg=?,height_cm=?,activity_level=?,goal_type=?,custom_api_key=? WHERE id=1', [p.name,p.gender,p.age,p.weight_kg,p.height_cm,p.activity_level,p.goal_type,p.custom_api_key || '']);
    await tx.runAsync('UPDATE goals SET calories=?,protein=?,carbs=?,fat=?,water_ml=?,exercise_minutes=? WHERE id=1', [g.calories,g.protein,g.carbs,g.fat,g.water_ml,g.exercise_minutes]);
  });
}

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
  await clearAllLogs();
  await seedDemoDataIfEmpty();
}

let replacementPending = false;
async function replaceData(action) {
  if (replacementPending) throw new Error('A data update is already in progress.');
  replacementPending = true;
  try { await notifyDataReplacement('before'); return await action(); }
  finally { replacementPending = false; await notifyDataReplacement('after'); }
}
async function allStoredImages() {
  const meals = IS_WEB ? webStore.meals : await dbInstance.getAllAsync('SELECT image_uri,thumbnail_uri,metadata FROM meals');
  const jobs = await listScanJobs();
  return [...meals.flatMap(referencedImages), ...jobs.flatMap((j) => [...j.photos.map((p) => p.uri), j.thumbnailUri].filter(Boolean))];
}

/**
 * Factory Reset: Completely wipes all meals, exercises, water records, and custom profiles.
 * Restores virgin state without loading demo data.
 */
export async function factoryResetAllData() {
  await initDatabase();
  return replaceData(async () => {
  const images = await allStoredImages();
  if (IS_WEB) {
    webStore = { meals: [], exercises: [], water_intake: [], settings: {}, scan_jobs: [], scan_receipts: [], goals: { ...DEFAULT_GOALS }, profile: { ...DEFAULT_PROFILE } };
    saveWebStore();
  } else {
    await dbInstance.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync('DELETE FROM meals; DELETE FROM exercises; DELETE FROM water_intake; DELETE FROM goals; DELETE FROM profile; DELETE FROM scan_jobs; DELETE FROM scan_receipts; DELETE FROM app_settings;');
      const p = DEFAULT_PROFILE; const g = DEFAULT_GOALS;
      await tx.runAsync('INSERT INTO profile (id,name,gender,age,weight_kg,height_cm,activity_level,goal_type,custom_api_key) VALUES (1,?,?,?,?,?,?,?,?)', [p.name,p.gender,p.age,p.weight_kg,p.height_cm,p.activity_level,p.goal_type,p.custom_api_key]);
      await tx.runAsync('INSERT INTO goals (id,calories,protein,carbs,fat,water_ml,exercise_minutes) VALUES (1,?,?,?,?,?,?)', [g.calories,g.protein,g.carbs,g.fat,g.water_ml,g.exercise_minutes]);
    });
  }
  await cleanupUnreferencedImages(images);
  });
}

/**
 * Clears all meal logs, workout history, and water intake to start from a completely clean slate.
 */
export async function clearAllLogs() {
  await initDatabase();
  return replaceData(async () => {
  const images = await allStoredImages();
  if (IS_WEB) {
    webStore.meals = []; webStore.exercises = []; webStore.water_intake = [];
    webStore.scan_jobs = []; webStore.scan_receipts = [];
    saveWebStore();
  } else {
    await dbInstance.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync('DELETE FROM meals; DELETE FROM exercises; DELETE FROM water_intake; DELETE FROM scan_jobs; DELETE FROM scan_receipts;');
    });
  }
  await cleanupUnreferencedImages(images);
  });
}

/**
 * Exports all database records as a structured JSON backup
 */
export async function exportAllDataJSON() {
  await initDatabase();
  if (IS_WEB || !dbInstance) {
    return JSON.stringify(
      {
        schema_version: 2,
        app: 'CalorieSnap Pro',
        exportedAt: new Date().toISOString(),
        profile: publicProfile(webStore.profile),
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
      profile: publicProfile(profile),
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

function publicProfile(profile) {
  const { custom_api_key, ...safe } = profile || {};
  return safe;
}

/**
 * Imports database records from a structured JSON backup with schema-version normalization
 */
export async function importAllDataJSON(jsonString) {
  await initDatabase();
  let parsed;
  try { parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString; }
  catch { throw new Error('Invalid JSON format. Please provide a valid backup file.'); }
  validateBackup(parsed);
  const profile = validateProfile({ ...DEFAULT_PROFILE, ...publicProfile(parsed.profile), custom_api_key: (await getProfile()).custom_api_key || '' });
  const goals = validateGoals({ ...DEFAULT_GOALS, ...parsed.goals });
  const normalize = (records, validator) => records.map((record, index) => validator({ ...record, id: index + 1, timestamp: record.timestamp || new Date().toISOString() }));
  const meals = normalize(parsed.meals, (m) => validateMeal({ ...m, meal_type: m.meal_type || 'snack', image_uri: m.image_uri || null, portion: m.portion || '1 serving' }));
  const exercises = normalize(parsed.exercises, validateExercise);
  const water_intake = normalize(parsed.water_intake, (w) => w);
  return replaceData(async () => {
  const oldImages = await allStoredImages();
  if (IS_WEB) {
    webStore = { ...webStore, profile, goals, meals, exercises, water_intake, scan_jobs: [], scan_receipts: [] };
    saveWebStore();
  } else {
    // All validation happens before deletion; a failed write rolls back everything.
    await dbInstance.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync('DELETE FROM meals; DELETE FROM exercises; DELETE FROM water_intake; DELETE FROM scan_jobs; DELETE FROM scan_receipts;');
      await tx.runAsync('UPDATE profile SET name=?, gender=?, age=?, weight_kg=?, height_cm=?, activity_level=?, goal_type=?, custom_api_key=? WHERE id=1', [profile.name, profile.gender, profile.age, profile.weight_kg, profile.height_cm, profile.activity_level, profile.goal_type, profile.custom_api_key || '']);
      await tx.runAsync('UPDATE goals SET calories=?, protein=?, carbs=?, fat=?, water_ml=?, exercise_minutes=? WHERE id=1', [goals.calories, goals.protein, goals.carbs, goals.fat, goals.water_ml, goals.exercise_minutes]);
      for (const m of meals) await tx.runAsync('INSERT INTO meals (date,timestamp,meal_type,name,calories,protein,carbs,fat,fiber,sugar,sodium,portion,image_uri,metadata,thumbnail_uri) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [m.date,m.timestamp,m.meal_type,m.name,m.calories,m.protein,m.carbs,m.fat,m.fiber,m.sugar,m.sodium,m.portion,m.image_uri,JSON.stringify(mealMetadata(m)),m.thumbnail_uri || null]);
      for (const e of exercises) await tx.runAsync('INSERT INTO exercises (date,timestamp,exercise_name,duration_minutes,calories_burned,intensity,category) VALUES (?,?,?,?,?,?,?)', [e.date,e.timestamp,e.exercise_name,e.duration_minutes,e.calories_burned,e.intensity || 'moderate',e.category || 'cardio']);
      for (const w of water_intake) await tx.runAsync('INSERT INTO water_intake (date,timestamp,amount_ml) VALUES (?,?,?)', [w.date,w.timestamp,w.amount_ml]);
    });
  }
  await cleanupUnreferencedImages(oldImages);
  return { schemaVersion: parsed.schema_version || parsed.version || 1, mealCount: meals.length, exerciseCount: exercises.length, waterCount: water_intake.length };
  });
}

/**
 * Computes daily nutritional summary for a specific date
 */
export async function getDailySummary(date) {
  const [meals, exercises, water] = await Promise.all([
    getMealsByDate(date),
    getExercisesByDate(date),
    getWaterIntakeByDate(date),
  ]);

  const calories = meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
  const protein = meals.reduce((sum, m) => sum + (Number(m.protein) || 0), 0);
  const carbs = meals.reduce((sum, m) => sum + (Number(m.carbs) || 0), 0);
  const fat = meals.reduce((sum, m) => sum + (Number(m.fat) || 0), 0);
  const fiber = meals.reduce((sum, m) => sum + (Number(m.fiber) || 0), 0);
  const caloriesBurned = exercises.reduce((sum, e) => sum + (Number(e.calories_burned) || 0), 0);
  const waterMl = water.reduce((sum, w) => sum + (Number(w.amount_ml) || 0), 0);

  return {
    date,
    totals: {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      fiber: Math.round(fiber),
      waterMl: Math.round(waterMl),
      caloriesBurned: Math.round(caloriesBurned),
      netCalories: Math.round(calories - caloriesBurned),
    },
  };
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

  await initDatabase();
  const start = dates[0], end = dates[6];
  const sum = (records, fields) => {
    const grouped = new Map();
    for (const record of records) {
      if (record.date < start || record.date > end) continue;
      const row = grouped.get(record.date) || { date: record.date };
      for (const field of fields) row[field] = (row[field] || 0) + (Number(record[field]) || 0);
      grouped.set(record.date, row);
    }
    return [...grouped.values()];
  };
  const [meals, workouts, water] = IS_WEB ? [sum(webStore.meals, ['calories','protein','carbs','fat']), sum(webStore.exercises, ['calories_burned']), sum(webStore.water_intake, ['amount_ml'])] : await Promise.all([
    dbInstance.getAllAsync('SELECT date,SUM(calories) AS calories,SUM(protein) AS protein,SUM(carbs) AS carbs,SUM(fat) AS fat FROM meals WHERE date BETWEEN ? AND ? GROUP BY date', [start,end]),
    dbInstance.getAllAsync('SELECT date,SUM(calories_burned) AS calories_burned FROM exercises WHERE date BETWEEN ? AND ? GROUP BY date', [start,end]),
    dbInstance.getAllAsync('SELECT date,SUM(amount_ml) AS amount_ml FROM water_intake WHERE date BETWEEN ? AND ? GROUP BY date', [start,end]),
  ]);
  const byDate = (rows) => new Map(rows.map((r) => [r.date, r]));
  const m = byDate(meals), e = byDate(workouts), w = byDate(water);
  return dates.map((date) => {
    const food = m.get(date) || {}, calories = Math.round(food.calories || 0), caloriesBurned = Math.round(e.get(date)?.calories_burned || 0);
    return { date, calories, caloriesBurned, netCalories: calories - caloriesBurned, protein: Math.round(food.protein || 0), carbs: Math.round(food.carbs || 0), fat: Math.round(food.fat || 0), waterMl: Math.round(w.get(date)?.amount_ml || 0) };
  });
}

/**
 * Calculates current active streak given a list of unique logged dates
 */
export function calculateStreakFromDates(uniqueDateList = [], todayStr = getTodayString()) {
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

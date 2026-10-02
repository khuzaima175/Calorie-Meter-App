// Shared validation at the persistence boundary, including imported records.
export function numberInRange(value, label, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  if (value === null || value === undefined || String(value).trim() === '' || !Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${label} must be a number between ${min} and ${max}.`);
  }
  return number;
}

export function validateDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid log date.');
  const [y, m, d] = date.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);
  if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) throw new Error('Invalid log date.');
  return date;
}

export function validateMeal(meal) {
  if (typeof meal?.name !== 'string' || !meal.name.trim()) throw new Error('Please enter a meal name.');
  if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(meal.meal_type)) throw new Error('Invalid meal category.');
  const result = { ...meal, name: meal.name.trim() };
  for (const field of ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium']) {
    result[field] = numberInRange(meal[field] ?? 0, field, 0, field === 'calories' ? 10000 : field === 'sodium' ? 100000 : 1000);
  }
  if (meal.date) validateDate(meal.date);
  if (meal.image_uri != null && typeof meal.image_uri !== 'string') throw new Error('Invalid meal image.');
  return result;
}

export function validateExercise(exercise) {
  if (typeof exercise?.exercise_name !== 'string' || !exercise.exercise_name.trim()) throw new Error('Please enter an exercise name.');
  return { ...exercise,
    duration_minutes: numberInRange(exercise.duration_minutes, 'Duration', 1, 720),
    calories_burned: numberInRange(exercise.calories_burned, 'Calories burned', 0, 10000),
  };
}

export function validateProfile(profile) {
  const result = { ...profile,
    age: numberInRange(profile.age, 'Age', 1, 120),
    weight_kg: numberInRange(profile.weight_kg, 'Weight', 1, 500),
    height_cm: numberInRange(profile.height_cm, 'Height', 30, 300),
  };
  if (!Number.isInteger(result.age)) throw new Error('Age must be a whole number.');
  if (!['male', 'female'].includes(profile.gender) || !['sedentary', 'light', 'moderate', 'active', 'very_active'].includes(profile.activity_level) || !['maintain', 'lose_weight', 'gain_muscle'].includes(profile.goal_type)) throw new Error('Invalid profile options.');
  return result;
}

export function validateGoals(goals) {
  const result = { ...goals };
  for (const field of ['calories', 'protein', 'carbs', 'fat', 'water_ml', 'exercise_minutes']) {
    result[field] = numberInRange(goals[field], field, ['calories', 'water_ml'].includes(field) ? 1 : 0, field === 'exercise_minutes' ? 720 : 10000);
  }
  return result;
}

export function validateBackup(backup) {
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) throw new Error('Malformed backup object.');
  const version = backup.schema_version ?? backup.version ?? 1;
  if (![1, 2].includes(version)) throw new Error('Unsupported backup version.');
  for (const field of ['meals', 'exercises', 'water_intake']) {
    if (!Array.isArray(backup[field])) throw new Error(`Backup must include a ${field} array.`);
    const ids = new Set();
    for (const record of backup[field]) {
      if (!record || typeof record !== 'object') throw new Error(`Invalid ${field} record.`);
      validateDate(record.date);
      if (record.timestamp && !Number.isFinite(Date.parse(record.timestamp))) throw new Error('Invalid backup timestamp.');
      if (record.id != null) {
        numberInRange(record.id, 'Record ID', 1);
        if (!Number.isSafeInteger(record.id) || ids.has(record.id)) throw new Error('Duplicate or invalid backup record ID.');
        ids.add(record.id);
      }
      if (field === 'meals') validateMeal({ ...record, meal_type: record.meal_type || 'snack' });
      if (field === 'exercises') validateExercise(record);
      if (field === 'water_intake') numberInRange(record.amount_ml, 'Water volume', 1, 10000);
    }
  }
  return backup;
}

export function isPlainWater(analysis) {
  if (typeof analysis?.is_water === 'boolean') return analysis.is_water;
  return /^(?:(?:a|one|1)\s+)?(?:(?:glass|bottle|cup)\s+of\s+)?(?:plain|drinking|mineral|sparkling|tap|bottled)?\s*water$/i.test(analysis?.name?.trim() || '');
}

export function normalizeAnalysis(analysis) {
  const meal = validateMeal({ ...analysis, meal_type: analysis?.meal_type || 'snack' });
  meal.portion = typeof analysis.portion === 'string' ? analysis.portion : '1 serving';
  meal.dietary_tags = Array.isArray(analysis.dietary_tags) ? analysis.dietary_tags.filter((tag) => typeof tag === 'string') : [];
  meal.health_tips = Array.isArray(analysis.health_tips) ? analysis.health_tips.filter((tip) => typeof tip === 'string').join(' ') : typeof analysis.health_tips === 'string' ? analysis.health_tips : '';
  if (meal.is_water) meal.water_ml = numberInRange(analysis.water_ml || 250, 'Water volume', 1, 10000);
  return meal;
}

export function normalizeMealPlan(plan) {
  if (!Array.isArray(plan?.meals) || plan.meals.length === 0) throw new Error('AI returned no meals. Please try again.');
  const meals = plan.meals.map((item) => {
    const meal = validateMeal({ ...item, name: item.title, meal_type: item.meal_type || 'snack' });
    return { ...meal, title: meal.name,
      ingredients: Array.isArray(item.ingredients) ? item.ingredients.filter((ingredient) => typeof ingredient === 'string') : [],
      instructions: typeof item.instructions === 'string' ? item.instructions : '',
    };
  });
  return { ...plan, meals,
    totalCalories: Math.round(meals.reduce((sum, meal) => sum + meal.calories, 0)),
    totalProtein: Math.round(meals.reduce((sum, meal) => sum + meal.protein, 0)),
    totalCarbs: Math.round(meals.reduce((sum, meal) => sum + meal.carbs, 0)),
    totalFat: Math.round(meals.reduce((sum, meal) => sum + meal.fat, 0)),
  };
}

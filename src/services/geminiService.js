import { useProfileStore } from '../stores/useProfileStore';

// Models: 3.7 Flash as Primary, 3.5 Flash-Lite as Secondary & Chat
const PRIMARY_MODEL = 'gemini-3.7-flash';
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

/**
 * Returns current real-time meal period for Pakistani / local daily routine
 */
export function getCurrentMealPeriod() {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (hours >= 5 && hours < 11.5) {
    return {
      mealType: 'breakfast',
      label: 'Breakfast (Nashta)',
      timeStr,
      hint: 'Morning breakfast / nashta time (e.g. anda paratha, chai, toast, omelette, halwa puri, nihari)',
    };
  } else if (hours >= 11.5 && hours < 16.5) {
    return {
      mealType: 'lunch',
      label: 'Lunch (Dopahar ka Khana)',
      timeStr,
      hint: 'Afternoon lunch time (e.g. roti, daal, salan, chicken karahi, biryani, rice, sabzi)',
    };
  } else if (hours >= 16.5 && hours < 19.5) {
    return {
      mealType: 'snack',
      label: 'Evening Snack (Sham ki Chai)',
      timeStr,
      hint: 'Evening tea / snack time (e.g. chai, biscuits, samosa, pakora, fruit chaat, bun kabab)',
    };
  } else if (hours >= 19.5 && hours < 23.5) {
    return {
      mealType: 'dinner',
      label: 'Dinner (Raat ka Khana)',
      timeStr,
      hint: 'Night dinner time (e.g. karahi, bbq tikka, kebab, roti, salan, rice, salad)',
    };
  } else {
    return {
      mealType: 'snack',
      label: 'Late Night Snack',
      timeStr,
      hint: 'Late night snack period',
    };
  }
}

export function getApiKey() {
  try {
    const customKey = useProfileStore?.getState()?.profile?.custom_api_key;
    if (customKey && customKey.trim() && !customKey.startsWith('AIzaSy_REPLACE')) {
      return customKey.trim();
    }
  } catch {}

  const envKey = process.env.EXPO_PUBLIC_GEMINI_KEY;
  if (envKey && envKey.trim() && !envKey.startsWith('AIzaSy_REPLACE')) {
    return envKey.trim();
  }

  return '';
}

// Rolling window rate limiter (max 15 requests per 60 seconds)
class RateLimiter {
  constructor(maxRequests = 15, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.timestamps = [];
  }

  canRequest() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    return this.timestamps.length < this.maxRequests;
  }

  recordRequest() {
    this.timestamps.push(Date.now());
  }

  getWaitSeconds() {
    if (this.canRequest()) return 0;
    const oldest = this.timestamps[0];
    const diff = this.windowMs - (Date.now() - oldest);
    return Math.max(1, Math.ceil(diff / 1000));
  }
}

const rateLimiter = new RateLimiter(15, 60000);

/**
 * Parses raw Gemini API error responses into user-friendly, actionable messages
 */
export function parseAndFormatGeminiError(errorInput, status = 0) {
  let message = '';
  let statusStr = '';

  try {
    const parsed = typeof errorInput === 'string' ? JSON.parse(errorInput) : errorInput;
    message = parsed?.error?.message || '';
    statusStr = parsed?.error?.status || '';
  } catch {
    message = typeof errorInput === 'string' ? errorInput : errorInput?.message || '';
  }

  const combined = `${message} ${statusStr}`.toLowerCase();
  const hasCustomKey = Boolean(useProfileStore?.getState()?.profile?.custom_api_key?.trim());

  // 1. Quota / Rate limit exceeded (429 / RESOURCE_EXHAUSTED / Quota exceeded)
  if (
    status === 429 ||
    combined.includes('429') ||
    combined.includes('resource_exhausted') ||
    combined.includes('quota') ||
    combined.includes('rate_limit_exceeded') ||
    combined.includes('too many requests')
  ) {
    if (hasCustomKey) {
      return (
        '⚠️ Gemini Quota Limit Reached\n\n' +
        'Your personal Gemini API key has temporarily exceeded its requests-per-minute quota. ' +
        'Please wait 30–60 seconds before trying again, or check your quota in Google AI Studio.'
      );
    }
    return (
      '⚠️ Gemini AI Quota Reached\n\n' +
      'The default shared API key has temporarily reached its Google request quota limit. ' +
      'You can paste your own free Gemini API key in Profile > Settings to get instant, unlimited access, or please try again in a few minutes.'
    );
  }

  // 2. Invalid API Key
  if (
    status === 400 &&
    (combined.includes('api_key_invalid') ||
      combined.includes('api key not valid') ||
      combined.includes('invalid api key') ||
      combined.includes('key not found'))
  ) {
    return (
      '⚠️ Invalid Gemini API Key\n\n' +
      'Google rejected the configured API key. Please check or re-enter your API key in Profile > Settings.'
    );
  }

  // 3. Model overload / 503
  if (status === 503 || combined.includes('overloaded') || combined.includes('unavailable')) {
    return (
      '⚠️ Gemini Service Busy\n\n' +
      'Google AI servers are momentarily busy. Please try again in a few seconds.'
    );
  }

  // 4. Return parsed message if available, else standard message
  return message || `Gemini AI service unavailable (Status ${status || 'unknown'}). Please try again.`;
}

/**
 * Quick validation helper to test an API key directly from Settings
 */
export async function testGeminiApiKey(candidateKey) {
  const keyToTest = candidateKey ? candidateKey.trim() : getApiKey();
  if (!keyToTest || keyToTest.startsWith('AIzaSy_REPLACE')) {
    return {
      success: false,
      error: 'No API key provided. Please enter a valid Gemini API key.',
    };
  }

  const startTime = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${PRIMARY_MODEL}:generateContent?key=${keyToTest}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: 'Reply with only the word: OK' }] }],
    generationConfig: { maxOutputTokens: 5, temperature: 0.1 },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const elapsedMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      // If 404 on PRIMARY, check FALLBACK
      if (response.status === 404) {
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${FALLBACK_MODEL}:generateContent?key=${keyToTest}`;
        const fallbackRes = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (fallbackRes.ok) {
          return {
            success: true,
            latencyMs: Date.now() - startTime,
            model: FALLBACK_MODEL,
          };
        }
        const fallbackErr = await fallbackRes.text();
        return {
          success: false,
          error: parseAndFormatGeminiError(fallbackErr, fallbackRes.status),
        };
      }
      return {
        success: false,
        error: parseAndFormatGeminiError(errorText, response.status),
      };
    }

    return {
      success: true,
      latencyMs: elapsedMs,
      model: PRIMARY_MODEL,
    };
  } catch (err) {
    return {
      success: false,
      error: err?.message || 'Network error connecting to Gemini API.',
    };
  }
}

/**
 * Core caller for Gemini REST API with fallback, rate limiting, and friendly error formatting
 */
async function callGemini(contents, systemInstruction = '', model = PRIMARY_MODEL) {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.startsWith('AIzaSy_REPLACE')) {
    throw new Error('Please set your Gemini API key in Profile > Settings or in your .env file.');
  }

  if (!rateLimiter.canRequest()) {
    const waitSec = rateLimiter.getWaitSeconds();
    throw new Error(`AI rate limit reached. Please wait ${waitSec} seconds before asking again.`);
  }

  rateLimiter.recordRequest();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents,
    generationConfig: {
      temperature: 0.2,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // If 429 Quota Exceeded or Rate Limit, do NOT retry (same project/key limit)
      if (response.status === 429 || errorText.includes('RESOURCE_EXHAUSTED') || errorText.includes('quota')) {
        const friendlyMsg = parseAndFormatGeminiError(errorText, response.status);
        throw new Error(friendlyMsg);
      }

      // If model 404 or bad model request on PRIMARY, retry with FALLBACK
      if (model === PRIMARY_MODEL && (response.status === 404 || response.status === 400)) {
        // But if it's invalid key, fail fast
        if (errorText.includes('API_KEY_INVALID') || errorText.includes('API key not valid')) {
          const friendlyMsg = parseAndFormatGeminiError(errorText, response.status);
          throw new Error(friendlyMsg);
        }
        console.warn(`Model ${PRIMARY_MODEL} returned ${response.status}, retrying with ${FALLBACK_MODEL}...`);
        return await callGemini(contents, systemInstruction, FALLBACK_MODEL);
      }

      const friendlyMsg = parseAndFormatGeminiError(errorText, response.status);
      throw new Error(friendlyMsg);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return candidateText;
  } catch (error) {
    // If it's already a quota, rate limit, or invalid key message, do not retry fallback
    if (
      error.message.includes('Quota') ||
      error.message.includes('quota') ||
      error.message.includes('rate limit') ||
      error.message.includes('Invalid Gemini API Key')
    ) {
      throw error;
    }

    if (model === PRIMARY_MODEL) {
      return await callGemini(contents, systemInstruction, FALLBACK_MODEL);
    }
    throw error;
  }
}

/**
 * Extracts and cleans JSON from raw markdown text
 */
function cleanJsonText(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned;
}

/**
 * 1. AI Photo Recognition: Identifies food items, portions, and complete macros
 * Specialized for Pakistani / South Asian / Global cuisines with multi-image support
 * and real-time meal period awareness.
 */
export async function analyzeFoodPhoto(photosInput, mimeType = 'image/jpeg', context = {}) {
  const currentPeriod = context.mealPeriod || getCurrentMealPeriod();
  const userNote = (context.userNote || '').trim();

  // Normalize photosInput into array of inlineData parts (supports single base64 or array of images)
  let imageParts = [];
  if (Array.isArray(photosInput)) {
    imageParts = photosInput.map((p) => ({
      inlineData: {
        mimeType: p.mimeType || mimeType || 'image/jpeg',
        data: p.base64 || p,
      },
    }));
  } else if (typeof photosInput === 'object' && photosInput.base64) {
    imageParts = [
      {
        inlineData: {
          mimeType: photosInput.mimeType || mimeType || 'image/jpeg',
          data: photosInput.base64,
        },
      },
    ];
  } else if (typeof photosInput === 'string') {
    imageParts = [
      {
        inlineData: {
          mimeType,
          data: photosInput,
        },
      },
    ];
  }

  if (imageParts.length === 0) {
    throw new Error('No photo provided for AI analysis.');
  }

  const systemPrompt = `You are a certified clinical sports dietitian and computer vision food expert with deep expertise in Pakistani, South Asian, and International cuisines.
Analyze all provided meal photographs and calculate exact portions and macronutrients.

Specialized Pakistani / Desi Cuisine Guidelines:
- Rotis & Breads:
  * Whole wheat roti / chapati (~35g flour): ~100-120 kcal, 3g P, 22g C, 0.5g F.
  * Tandoori roti: ~110-130 kcal.
  * Plain paratha (ghee/oil): ~260-320 kcal, 4g P, 30g C, 14g F.
  * Aloo/Keema paratha: ~320-380 kcal.
  * Roghani/Tandoori naan: ~280-380 kcal. Puri: ~150-180 kcal.
- Rice Dishes:
  * Chicken Biryani (1 plate ~350g): ~480-550 kcal, 28g P, 65g C, 18g F.
  * Mutton/Beef Biryani: ~580-680 kcal, 32g P, 65g C, 25g F.
  * Chicken / Matar Pulao: ~400-480 kcal. Daal Chawal: ~380-450 kcal.
- Salans, Curries & Gravies:
  * Chicken Karahi / Korma / Handi (1 cup): ~320-380 kcal, 32g P, 20g F (accounts for cooking oil).
  * Nihari (1 plate): ~550-650 kcal, 45g P, 15g C, 35g F.
  * Haleem (1 bowl): ~380-450 kcal, 25g P, 45g C, 12g F.
  * Daal Chana / Mash / Moong / Tadka (1 cup): ~220-280 kcal, 14g P, 35g C, 8g F.
  * Palak Gosht / Paneer: ~280-350 kcal. Aloo Gosht: ~340-400 kcal. Bhindi Masala: ~160-200 kcal.
- Breakfast / Nashta:
  * Anda Paratha (1 paratha + 1 egg): ~400-450 kcal.
  * Omelette (onion, tomato, chilli): ~180-220 kcal.
  * Doodh Patti Chai (with sugar): ~120-150 kcal. Plain black/green tea: 0-5 kcal.
  * Halwa Puri Chana (2 puris + halwa + chana): ~750-900 kcal.
- Snacks & Street Foods:
  * Samosa (1 pc): ~160-200 kcal. Pakora plate (4-5 pcs): ~240-300 kcal.
  * Dahi Bhallay / Chaat: ~280-350 kcal. Shami Bun Kabab: ~380-450 kcal. Chicken Roll: ~450-550 kcal.
- Water / Hydration:
  * If plain water or zero-calorie beverage, set is_water: true and estimate water_ml accurately.
- Portion & User Context:
  * If the user provided notes (e.g. "ate 40%", "half plate", "light oil", "skinless chicken"), mathematically scale the final macros and calorie output to match that exact portion.

Return ONLY a valid, raw JSON object (without markdown code fences) with the exact structure:
{
  "name": "Short descriptive meal title (e.g. Chicken Karahi with 2 Whole Wheat Rotis)",
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "portion": "e.g. 1 cup karahi (200g) + 2 rotis (70g) or 1 glass (250ml)",
  "calories": 520,
  "protein": 36,
  "carbs": 48,
  "fat": 18,
  "fiber": 6,
  "sugar": 3,
  "sodium": 520,
  "health_score": 8,
  "confidence": 0.94,
  "is_water": false,
  "water_ml": 0,
  "ingredients": ["200g bone-in chicken", "2 whole wheat chapatis", "Tomato-ginger gravy", "1.5 tsp cooking oil"],
  "dietary_tags": ["High Protein", "Pakistani Staple", "Home Cooked"],
  "health_tips": "Great protein density. Pair with fresh kachumber salad to boost micronutrients and fiber."
}`;

  let promptInstruction = `Analyze all food items visible across the ${imageParts.length} photo(s).`;
  promptInstruction += `\nDevice Local Time: ${currentPeriod.timeStr} (${currentPeriod.label} - ${currentPeriod.hint}). Default meal_type to ${currentPeriod.mealType} unless visual evidence clearly shows another meal.`;

  if (userNote) {
    promptInstruction += `\nUser Custom Note / Portion Details: "${userNote}". Strictly apply this portion/percentage/ingredient adjustment to your calculated calories and macros.`;
  }

  const contents = [
    {
      role: 'user',
      parts: [
        ...imageParts,
        { text: promptInstruction },
      ],
    },
  ];

  const rawOutput = await callGemini(contents, systemPrompt);
  try {
    return JSON.parse(cleanJsonText(rawOutput));
  } catch (err) {
    console.error('Failed to parse Gemini photo response:', rawOutput);
    throw new Error('AI was unable to parse the food structure. Please try another angle or enter details.');
  }
}

/**
 * 2. Nutrition Label Scanner (OCR): Reads Nutrition Facts tables from packaged products
 */
export async function analyzeNutritionLabel(base64Image, mimeType = 'image/jpeg') {
  const systemPrompt = `You are an OCR expert specializing in reading FDA and international Nutrition Facts food labels.
Extract the nutrition data and return ONLY a valid JSON object:
{
  "name": "Product Name (or brand if visible)",
  "meal_type": "snack",
  "portion": "e.g. 1 bar (55g) or 1 serving",
  "calories": 210,
  "protein": 15,
  "carbs": 24,
  "fat": 7,
  "fiber": 10,
  "sugar": 1,
  "sodium": 180,
  "health_score": 7,
  "confidence": 0.95,
  "dietary_tags": ["Packaged Good"],
  "health_tips": "Nutrition extracted directly from product label."
}`;

  const contents = [
    {
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },
        {
          text: 'Read the Nutrition Facts label carefully. Extract Calories, Protein (g), Total Carbohydrates (g), Total Fat (g), Dietary Fiber (g), Total Sugars (g), and Sodium (mg) per serving.',
        },
      ],
    },
  ];

  const rawOutput = await callGemini(contents, systemPrompt);
  try {
    return JSON.parse(cleanJsonText(rawOutput));
  } catch (err) {
    console.error('Failed to parse Gemini label response:', rawOutput);
    throw new Error('Could not clearly read the label. Make sure the Nutrition Facts table is well-lit.');
  }
}

/**
 * 3. Natural Language Meal Parser: Parses user text into exact macros
 * Specialized for Pakistani / South Asian foods & natural Roman Urdu / English phrases
 */
export async function parseMealDescription(textInput, context = {}) {
  const currentPeriod = context.mealPeriod || getCurrentMealPeriod();

  const systemPrompt = `You are a nutrition database parser with deep expertise in Pakistani, South Asian, and International foods.
The user will describe what they ate in natural speech or Roman Urdu / English (e.g. "2 roti with daal mash and salad", "chicken biryani 1 plate with raita", "1 anda paratha and doodh patti chai", "ate 40% of a chicken burger", "half plate mutton karahi and 1 naan").

Accurate Desi Nutritional Guidelines:
- 1 standard home Roti / Chapati = 100-120 kcal (3g protein, 22g carbs, 0.5g fat)
- 1 Paratha = 260-320 kcal (4g protein, 32g carbs, 14g fat)
- 1 cup Chicken Karahi / Korma = 320-380 kcal (32g protein, 8g carbs, 20g fat)
- 1 plate Chicken Biryani = 480-550 kcal (28g protein, 65g carbs, 18g fat)
- 1 cup Daal (Chana/Mash/Moong) = 220-280 kcal (14g protein, 35g carbs, 8g fat)
- 1 cup Doodh Patti Chai = 120-150 kcal (4g protein, 14g carbs, 6g fat)
- 1 plate Nihari = 550-650 kcal (45g protein, 15g carbs, 35g fat)
- If user mentions percentage or portion (e.g. "ate 40%", "half plate"), scale calories and macros to that exact fraction.

Return ONLY a valid JSON object:
{
  "name": "Clean concise meal name",
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "portion": "e.g. 2 rotis + 1 cup daal mash",
  "calories": 480,
  "protein": 20,
  "carbs": 68,
  "fat": 12,
  "fiber": 8,
  "sugar": 2,
  "sodium": 420,
  "health_score": 8,
  "confidence": 0.95,
  "ingredients": ["2 Whole Wheat Rotis", "Daal Mash", "Kachumber Salad"],
  "dietary_tags": ["High Fiber", "Pakistani Staple"],
  "health_tips": "Balanced protein and complex carbohydrates."
}`;

  const promptText = `Current local time: ${currentPeriod.timeStr} (${currentPeriod.label}). Estimate the full nutritional breakdown for: "${textInput}". Default meal_type to ${currentPeriod.mealType} unless description indicates otherwise.`;

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: promptText,
        },
      ],
    },
  ];

  const rawOutput = await callGemini(contents, systemPrompt);
  try {
    return JSON.parse(cleanJsonText(rawOutput));
  } catch (err) {
    console.error('Failed to parse Gemini text meal response:', rawOutput);
    throw new Error('Could not parse meal description. Please specify quantity and food items.');
  }
}

/**
 * 4. AI Nutritionist Chat Coach: Supportive, insightful, calm warm tone with Pakistani nutrition expertise
 */
export async function sendNutritionistChatMessage(chatHistory, userMessage, userContext = {}) {
  const { profile = {}, goals = {}, totals = {}, remaining = {} } = userContext;

  const systemPrompt = `You are "Sage", a thoughtful, calm, and evidence-based AI nutrition coach inside the CalorieSnap Pro app, specializing in Pakistani, South Asian, and Global wellness.
User Profile:
- Name: ${profile.name || 'Friend'}
- Age: ${profile.age || 25}, Gender: ${profile.gender || 'Not specified'}, Weight: ${profile.weight_kg || 70}kg, Height: ${profile.height_cm || 175}cm
- Primary Goal: ${profile.goal_type || 'Healthy Balance'} (Target: ${goals.calories || 2000} kcal/day)
- Today's Progress: Consumed ${totals.calories || 0} kcal (Remaining: ${remaining.calories ?? (goals.calories - (totals.calories || 0))} kcal)
- Today's Macros: Protein ${totals.protein || 0}g / ${goals.protein || 140}g, Carbs ${totals.carbs || 0}g / ${goals.carbs || 220}g, Fat ${totals.fat || 0}g / ${goals.fat || 65}g

Persona & Desi Nutritional Knowledge:
- Warm, encouraging, concise, and deeply practical.
- Recommend realistic Pakistani food swaps (e.g. swapping 2 oily parathas for 1 whole wheat roti + boiled egg / chicken tikka, reducing excess cooking oil / tarri in karahi, roasted chana for snacking, plain dahi / raita instead of mayonnaise, green tea / kahwa instead of sugary chai).
- Never scold or shame. Give concrete meal ideas and macro adjustments for local cooking.
- Keep responses under 220 words unless specifically asked for a full recipe.`;

  const contents = chatHistory.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  return await callGemini(contents, systemPrompt);
}

/**
 * 5. Daily Nutrition Review Generator
 */
export async function generateDailyReview(dailySummary, goals) {
  const systemPrompt = `You are a clinical sports nutritionist with expertise in Pakistani and balanced diets. Analyze today's logged intake and provide a 3-bullet concise review:
1. One strong positive achievement from today.
2. One key area of improvement (e.g. protein intake, excess oil reduction, hydration).
3. One concrete recommendation for tomorrow.
Keep the tone encouraging, warm, and under 120 words.`;

  const prompt = `Today's Log:
- Calories: ${dailySummary.totalCalories} / Goal: ${goals.calories} kcal
- Protein: ${dailySummary.totalProtein}g / Goal: ${goals.protein}g
- Carbs: ${dailySummary.totalCarbs}g / Goal: ${goals.carbs}g
- Fat: ${dailySummary.totalFat}g / Goal: ${goals.fat}g
- Water: ${dailySummary.totalWater}ml / Goal: ${goals.water_ml}ml
- Calories Burned via Exercise: ${dailySummary.totalBurned} kcal (${dailySummary.activeMinutes} mins)`;

  const contents = [{ role: 'user', parts: [{ text: prompt }] }];
  return await callGemini(contents, systemPrompt);
}

/**
 * 6. Personalized Meal Plan Generator: Generates delicious, healthy Pakistani & balanced meal plans
 */
export async function generatePersonalizedMealPlan(profile, goals, preferences = 'Pakistani balanced whole foods') {
  const systemPrompt = `You are a master meal prep chef and nutritionist specializing in healthy, high-protein Pakistani and balanced South Asian diets.
Generate a 1-day tailored meal plan matching:
Target Calories: ${goals.calories} kcal (Protein: ${goals.protein}g, Carbs: ${goals.carbs}g, Fat: ${goals.fat}g)
Dietary preferences: ${preferences}

Include realistic, delicious Pakistani meals (e.g. Anda Omelette with Whole Wheat Roti / Oats for breakfast, Grilled Chicken Tikka / Daal with Roti and Kachumber Salad for lunch, Roasted Chana & Green Tea for snack, Lean Beef/Chicken Karahi with Roti for dinner).

Return ONLY valid JSON with this structure:
{
  "dayTitle": "High Protein Desi Vitality Day",
  "totalCalories": ${goals.calories},
  "totalProtein": ${goals.protein},
  "totalCarbs": ${goals.carbs},
  "totalFat": ${goals.fat},
  "meals": [
    {
      "meal_type": "breakfast",
      "title": "2-Egg Herb Omelette with 1 Whole Wheat Roti & Chai",
      "calories": 420,
      "protein": 24,
      "carbs": 38,
      "fat": 16,
      "prepTime": "10 mins",
      "ingredients": ["2 eggs", "1 whole wheat chapati", "Onion & green chilli", "1 cup low-sugar doodh patti"],
      "instructions": "Whisk eggs with chopped onion, green chillies, and black pepper. Cook in 1 tsp olive oil and serve with warm chapati."
    },
    {
      "meal_type": "lunch",
      "title": "Tandoori Chicken Breast with Daal Chana & Salad",
      "calories": 620,
      "protein": 52,
      "carbs": 58,
      "fat": 16,
      "prepTime": "15 mins",
      "ingredients": ["180g grilled tandoori chicken", "1 cup daal chana", "1 roti", "Cucumber-tomato salad"],
      "instructions": "Serve grilled chicken tikka with warm daal chana, fresh kachumber salad with lemon juice, and 1 whole wheat roti."
    },
    {
      "meal_type": "snack",
      "title": "Roasted Bhuna Chana & Kashmiri Kahwa",
      "calories": 220,
      "protein": 14,
      "carbs": 26,
      "fat": 6,
      "prepTime": "2 mins",
      "ingredients": ["45g roasted chana", "1 cup green tea / kahwa with crushed almonds"],
      "instructions": "High-fiber, high-satiety traditional afternoon snack."
    },
    {
      "meal_type": "dinner",
      "title": "Homestyle Chicken Karahi with 1 Roti & Fresh Mint Raita",
      "calories": 640,
      "protein": 50,
      "carbs": 48,
      "fat": 20,
      "prepTime": "25 mins",
      "ingredients": ["200g chicken breast cubes", "Tomato-ginger gravy with 1.5 tsp oil", "1 whole wheat roti", "1/2 cup low-fat mint raita"],
      "instructions": "Sear chicken with fresh ginger, garlic, tomatoes, and ground spices. Serve with whole wheat roti and cooling mint raita."
    }
  ]
}`;

  const contents = [{ role: 'user', parts: [{ text: 'Generate meal plan matching these exact macros.' }] }];
  const rawOutput = await callGemini(contents, systemPrompt);
  try {
    return JSON.parse(cleanJsonText(rawOutput));
  } catch (err) {
    console.error('Failed to parse meal plan JSON:', rawOutput);
    throw new Error('Could not generate meal plan. Please try again.');
  }
}

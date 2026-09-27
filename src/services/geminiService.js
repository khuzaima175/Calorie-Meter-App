// src/services/geminiService.js
// Gemini 3.7 Flash Nutritionist & Vision Engine
// Features 15 req/min client-side rolling window rate-limiter

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY || '';
const PRIMARY_MODEL = 'gemini-3.7-flash';
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

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
 * Core caller for Gemini REST API with fallback and JSON parsing
 */
async function callGemini(contents, systemInstruction = '', model = PRIMARY_MODEL) {
  if (!API_KEY || API_KEY.startsWith('AIzaSy_REPLACE')) {
    throw new Error('Please set your Gemini API key in the .env file (EXPO_PUBLIC_GEMINI_KEY).');
  }

  if (!rateLimiter.canRequest()) {
    const waitSec = rateLimiter.getWaitSeconds();
    throw new Error(`AI rate limit reached. Please wait ${waitSec} seconds before asking again.`);
  }

  rateLimiter.recordRequest();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

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
      // If 2.5-flash fails with 404 or unsupported, retry with 1.5-flash
      if (model === PRIMARY_MODEL && (response.status === 404 || response.status === 400)) {
        console.warn(`Model ${PRIMARY_MODEL} returned ${response.status}, retrying with ${FALLBACK_MODEL}...`);
        return await callGemini(contents, systemInstruction, FALLBACK_MODEL);
      }
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return candidateText;
  } catch (error) {
    if (model === PRIMARY_MODEL && !error.message.includes('rate limit')) {
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
 */
export async function analyzeFoodPhoto(base64Image, mimeType = 'image/jpeg') {
  const systemPrompt = `You are a certified clinical sports dietitian and computer vision food expert.
Analyze the meal photograph and return ONLY a valid, raw JSON object (without markdown code fences) with the exact structure:
{
  "name": "Short descriptive meal title (e.g. Avocado Toast with Poached Egg)",
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "portion": "e.g. 2 slices (280g)",
  "calories": 420,
  "protein": 18,
  "carbs": 38,
  "fat": 22,
  "fiber": 7,
  "sugar": 2,
  "sodium": 380,
  "health_score": 8,
  "confidence": 0.92,
  "ingredients": ["1 Hass avocado", "2 slices sourdough", "1 pasture-raised egg"],
  "dietary_tags": ["High Fiber", "Healthy Fats", "Vegetarian"],
  "health_tips": "Great source of monounsaturated fats. Pair with extra spinach for added micronutrients."
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
          text: 'Analyze all food items visible on this plate. Estimate weights, realistic calories, and macronutrient profile accurately.',
        },
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
 */
export async function parseMealDescription(textInput) {
  const systemPrompt = `You are a nutrition database parser. The user will describe what they ate in natural speech.
Calculate the nutritional values and return ONLY a valid JSON object:
{
  "name": "Clean concise meal name",
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "portion": "e.g. 200g grilled chicken breast + 1 cup jasmine rice",
  "calories": 520,
  "protein": 54,
  "carbs": 45,
  "fat": 6,
  "fiber": 2,
  "sugar": 0,
  "sodium": 320,
  "health_score": 9,
  "confidence": 0.95,
  "ingredients": ["Chicken Breast", "Jasmine Rice"],
  "dietary_tags": ["High Protein", "Lean"],
  "health_tips": "Excellent lean protein source for muscle recovery."
}`;

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `Estimate the full nutritional breakdown for: "${textInput}"`,
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
 * 4. AI Nutritionist Chat Coach: Supportive, insightful, calm warm tone
 */
export async function sendNutritionistChatMessage(chatHistory, userMessage, userContext = {}) {
  const { profile = {}, goals = {}, totals = {}, remaining = {} } = userContext;

  const systemPrompt = `You are "Sage", a thoughtful, calm, and evidence-based AI nutrition coach inside the CalorieSnap Pro app.
User Profile:
- Name: ${profile.name || 'Friend'}
- Age: ${profile.age || 25}, Gender: ${profile.gender || 'Not specified'}, Weight: ${profile.weight_kg || 70}kg, Height: ${profile.height_cm || 175}cm
- Primary Goal: ${profile.goal_type || 'Healthy Balance'} (Target: ${goals.calories || 2000} kcal/day)
- Today's Progress: Consumed ${totals.calories || 0} kcal (Remaining: ${remaining.calories ?? (goals.calories - (totals.calories || 0))} kcal)
- Today's Macros: Protein ${totals.protein || 0}g / ${goals.protein || 140}g, Carbs ${totals.carbs || 0}g / ${goals.carbs || 220}g, Fat ${totals.fat || 0}g / ${goals.fat || 65}g

Persona & Tone:
- Warm, encouraging, concise, and deeply practical.
- Use formatting (bullet points, bold text) for readability.
- Never scold or shame. Give concrete meal ideas, recipe suggestions, and macro adjustments.
- If asked for what to eat with remaining calories, offer 2-3 specific, easy-to-make whole food suggestions.
- Keep responses under 250 words unless specifically asked for a full recipe or deep scientific explanation.`;

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
  const systemPrompt = `You are a clinical sports nutritionist. Analyze today's logged intake and provide a 3-bullet concise review:
1. One strong positive achievement from today.
2. One key area of improvement (e.g. fiber, hydration, protein timing).
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
 * 6. Personalized Meal Plan Generator
 */
export async function generatePersonalizedMealPlan(profile, goals, preferences = 'whole foods, balanced') {
  const systemPrompt = `You are a master meal prep chef and nutritionist.
Generate a 1-day tailored meal plan matching:
Target Calories: ${goals.calories} kcal (Protein: ${goals.protein}g, Carbs: ${goals.carbs}g, Fat: ${goals.fat}g)
Dietary preferences: ${preferences}

Return ONLY valid JSON with this structure:
{
  "dayTitle": "High Energy & Lean Recovery Day",
  "totalCalories": ${goals.calories},
  "totalProtein": ${goals.protein},
  "totalCarbs": ${goals.carbs},
  "totalFat": ${goals.fat},
  "meals": [
    {
      "meal_type": "breakfast",
      "title": "Protein Power Berry Oats",
      "calories": 450,
      "protein": 35,
      "carbs": 55,
      "fat": 10,
      "prepTime": "8 mins",
      "ingredients": ["50g rolled oats", "1 scoop whey protein", "100g blueberries", "15g chia seeds"],
      "instructions": "Mix oats with warm water/almond milk, stir in protein powder, and top with fresh berries."
    },
    {
      "meal_type": "lunch",
      "title": "Mediterranean Quinoa Salmon Bowl",
      "calories": 650,
      "protein": 48,
      "carbs": 60,
      "fat": 22,
      "prepTime": "15 mins",
      "ingredients": ["150g baked salmon", "1 cup cooked quinoa", "Cucumber", "Cherry tomatoes", "1 tsp olive oil"],
      "instructions": "Layer quinoa with flake salmon, diced veggies, and light lemon dressing."
    },
    {
      "meal_type": "snack",
      "title": "Greek Yogurt & Walnuts",
      "calories": 250,
      "protein": 20,
      "carbs": 12,
      "fat": 14,
      "prepTime": "2 mins",
      "ingredients": ["200g 0% Greek yogurt", "15g crushed walnuts", "Dash of cinnamon"],
      "instructions": "Combine in a bowl for high-protein satiety."
    },
    {
      "meal_type": "dinner",
      "title": "Lean Sirloin with Roasted Sweet Potato & Broccolini",
      "calories": 650,
      "protein": 52,
      "carbs": 55,
      "fat": 18,
      "prepTime": "20 mins",
      "ingredients": ["180g lean steak", "200g sweet potato cubes", "150g broccolini"],
      "instructions": "Pan sear steak 3-4 mins per side. Roast sweet potatoes and steam broccolini."
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

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const createLoader = require('./load-production.cjs');

// Loads the real geminiService with only the profile store and fetch stubbed.
function loadGemini(responses) {
  const requests = [];
  global.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    const next = responses.shift();
    if (next?.status) {
      return { ok: false, status: next.status, text: async () => next.body };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(next) }] } }] }),
    };
  };
  const load = createLoader({
    [path.resolve('src/stores/useProfileStore')]: {
      useProfileStore: { getState: () => ({ profile: { custom_api_key: 'test-key' } }) },
    },
  });
  return { gemini: load('src/services/geminiService.js'), requests };
}

const food = { name: 'Chicken Biryani', meal_type: 'lunch', portion: '1 plate', calories: 520, protein: 28, carbs: 65, fat: 18, is_no_food: false };
const noFood = { name: 'Not a recognizable food', meal_type: 'snack', portion: '', calories: 0, protein: 0, carbs: 0, fat: 0, is_no_food: true };
const photos = [{ base64: 'AAAA', mimeType: 'image/jpeg' }];

test('Photo analysis retries leniently once before reporting no food', async () => {
  const { gemini, requests } = loadGemini([noFood, food]);
  const result = await gemini.analyzeFoodPhoto(photos, 'image/jpeg', {});
  assert.equal(result.name, 'Chicken Biryani');
  assert.equal(requests.length, 2);
  const retryText = requests[1].contents[0].parts.at(-1).text;
  assert.match(retryText, /previous pass reported/i);
});

test('Photo analysis throws a tagged NO_FOOD error only after the lenient retry also fails', async () => {
  const { gemini, requests } = loadGemini([noFood, noFood]);
  await assert.rejects(
    () => gemini.analyzeFoodPhoto(photos, 'image/jpeg', {}),
    (error) => error.code === 'NO_FOOD' && /No food detected/.test(error.message)
  );
  assert.equal(requests.length, 2);
});

test('Photo analysis trusts a real estimate even if the model also set is_no_food', async () => {
  const { gemini, requests } = loadGemini([{ ...food, is_no_food: true }]);
  const result = await gemini.analyzeFoodPhoto(photos, 'image/jpeg', {});
  assert.equal(result.calories, 520);
  assert.equal(requests.length, 1);
});

test('Fast mode disables thinking and falls back cleanly when a model rejects it', async () => {
  const { gemini, requests } = loadGemini([
    { status: 400, body: JSON.stringify({ error: { message: 'Thinking budget is not supported for this model', status: 'INVALID_ARGUMENT' } }) },
    food,
    food,
  ]);
  const first = await gemini.analyzeFoodPhoto(photos, 'image/jpeg', {});
  assert.equal(first.name, 'Chicken Biryani');
  assert.deepEqual(requests[0].generationConfig.thinkingConfig, { thinkingBudget: 0 });
  assert.equal(requests[1].generationConfig.thinkingConfig, undefined);

  // The rejection is remembered, so later calls never send thinkingConfig again.
  await gemini.analyzeFoodPhoto(photos, 'image/jpeg', {});
  assert.equal(requests[2].generationConfig.thinkingConfig, undefined);
});

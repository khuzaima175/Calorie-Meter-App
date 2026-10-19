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

test('Fast mode uses minimal thinking and falls back cleanly on generic 400 INVALID_ARGUMENT', async () => {
  const { gemini, requests } = loadGemini([
    { status: 400, body: JSON.stringify({ error: { code: 400, message: 'Request contains an invalid argument.', status: 'INVALID_ARGUMENT' } }) },
    food,
    food,
  ]);
  const first = await gemini.analyzeFoodPhoto(photos, 'image/jpeg', {});
  assert.equal(first.name, 'Chicken Biryani');
  assert.deepEqual(requests[0].generationConfig.thinkingConfig, { thinkingLevel: 'MINIMAL' });
  assert.equal(requests[1].generationConfig.thinkingConfig, undefined);

  // The rejection is remembered, so later calls never send thinkingConfig again.
  await gemini.analyzeFoodPhoto(photos, 'image/jpeg', {});
  assert.equal(requests[2].generationConfig.thinkingConfig, undefined);
});

test('User cancellation aborts the actual fetch and never starts a fallback or vision retry',async()=>{
  const {gemini}=loadGemini([]);let signal,calls=0;
  global.fetch=async(_url,options)=>{calls++;signal=options.signal;return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})),{once:true}));};
  const controller=new AbortController();const pending=gemini.analyzeFoodPhoto(photos,'image/jpeg',{signal:controller.signal});
  controller.abort();await assert.rejects(pending,e=>e.code==='CANCELLED');assert.equal(signal.aborted,true);assert.equal(calls,1);
  await assert.rejects(gemini.analyzeFoodPhoto(photos,'image/jpeg',{signal:controller.signal}),e=>e.code==='CANCELLED');assert.equal(calls,1);
});

test('Lenient vision retries share the overall deadline',async(t)=>{
  let now=100000;t.mock.method(Date,'now',()=>now);
  const {gemini}=loadGemini([]);let calls=0;
  global.fetch=async()=>{calls++;now+=45001;return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(noFood)}]}}]})};};
  await assert.rejects(gemini.analyzeFoodPhoto(photos),e=>e.code==='TIMEOUT');assert.equal(calls,1);
});

test('An unrelated bad schema cannot disable fast mode for subsequent valid requests',async()=>{
  const {gemini,requests}=loadGemini([{status:400,body:JSON.stringify({error:{message:'responseSchema contains an unknown property',status:'INVALID_ARGUMENT'}})},food]);
  await assert.rejects(gemini.analyzeFoodPhoto(photos));await gemini.analyzeFoodPhoto(photos);
  assert.equal(requests.length,2);assert.deepEqual(requests[1].generationConfig.thinkingConfig,{thinkingLevel:'MINIMAL'});
});

test('Thinking compatibility learned for the primary model does not disable fallback fast mode',async()=>{
  const {gemini,requests}=loadGemini([{status:400,body:JSON.stringify({error:{message:'Request contains an invalid argument.'}})},food,{status:404,body:JSON.stringify({error:{message:'Model not found'}})},food]);
  await gemini.analyzeFoodPhoto(photos);await gemini.analyzeFoodPhoto(photos);
  assert.equal(requests.length,4);assert.equal(requests[2].generationConfig.thinkingConfig,undefined);assert.deepEqual(requests[3].generationConfig.thinkingConfig,{thinkingLevel:'MINIMAL'});
});

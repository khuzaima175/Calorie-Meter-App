const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const path = require('node:path');
const createLoader = require('./load-production.cjs');

// Drive the production handlers and hooks while replacing only native UI APIs.
function harness(file, extraMocks = {}) {
  let cursor = 0, dirty = false, tree, props;
  const hooks = [], pending = [];
  const react = { ...React,
    useState(initial) {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [hooks[index].value, value => {
        const next = typeof value === 'function' ? value(hooks[index].value) : value;
        if (!Object.is(next, hooks[index].value)) { hooks[index].value = next; dirty = true; }
      }];
    },
    useRef(value) { const index = cursor++; return hooks[index] ||= { current: value }; },
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = hooks[index];
      if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        pending.push(() => { previous?.cleanup?.(); hooks[index] = { deps, cleanup: effect() }; });
      }
    },
  };
  const native = { StyleSheet: { create: x => x }, Platform: { OS: 'web' },
    Animated: { Value: class { setValue() {} interpolate() { return 0; } },
      timing: () => ({}), sequence: () => ({}), loop: () => ({ start() {}, stop() {} }) },
  };
  for (const name of ['Modal', 'View', 'Text', 'TouchableOpacity', 'ScrollView', 'KeyboardAvoidingView', 'ActivityIndicator', 'Image']) native[name] = name;
  native.Animated.View = 'View';
  const alerts = [];
  const mocks = { react, 'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'View', useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    'expo-haptics': { impactAsync: async () => {}, notificationAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} },
    [path.resolve('src/services/alertService')]: { Alert: { alert: (...args) => alerts.push(args) } },
  };
  for (const name of ['Input', 'Button', 'Card', 'CameraScanner', 'BarcodeScanner', 'NutritionLabelScanner', 'FoodAnalysisResult']) {
    mocks[path.resolve(`src/components/${name}`)] = { __esModule: true, default: name };
  }
  const Component = createLoader({ ...mocks, ...extraMocks })(file).default;
  function render(nextProps = props) {
    props = nextProps;
    let iterations = 0;
    do {
      dirty = false; cursor = 0; tree = Component(props);
      while (pending.length) pending.shift()();
      if (++iterations > 20) throw new Error('Hook render loop');
    } while (dirty);
    return tree;
  }
  function find(predicate, node = tree) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const child of node) { const found = find(predicate, child); if (found) return found; } return; }
    if (predicate(node)) return node;
    return find(predicate, node.props?.children ?? null);
  }
  return { render, find, alerts, unmount() { for (const hook of hooks) hook?.cleanup?.(); } };
}

const geminiPath = path.resolve('src/services/geminiService');
const databasePath = path.resolve('src/stores/useNutritionStore');
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('Walking form rejects zero steps instead of logging phantom activity', async () => {
  let writes = 0;
  const app = harness('src/components/AddExerciseModal.js', { [geminiPath]: {} });
  app.render({ visible: true, onSave: async () => writes++, onClose() {} });
  app.find(n => n.type === 'TouchableOpacity' && JSON.stringify(n.props.children).includes('By Step Count')).props.onPress();
  app.render();
  app.find(n => n.type === 'Input' && n.props.label === 'Steps Taken').props.onChangeText('0');
  app.render();
  await app.find(n => n.type === 'Button' && n.props.onPress && n.props.title !== 'Estimate with AI').props.onPress();
  assert.equal(writes, 0);
  assert.equal(app.alerts.at(-1)[0], 'Invalid Walk');
});

test('Manual meal estimation canceled by leaving screen never writes or navigates later', async () => {
  const estimate = deferred(); let writes = 0, navigations = 0;
  const store = selector => selector({ addMeal: async () => writes++, logWater: async () => {} });
  store.getState = () => ({ selectedDate: '2026-10-01' });
  const app = harness('src/screens/LogMealScreen.js', {
    [geminiPath]: { parseMealDescription: () => estimate.promise },
    [databasePath]: { useNutritionStore: store },
    [path.resolve('src/services/barcodeService')]: {},
  });
  app.render({ navigation: { navigate: () => navigations++ } });
  app.find(n => n.type === 'TouchableOpacity' && JSON.stringify(n.props.children).includes('Manual')).props.onPress();
  app.render();
  app.find(n => n.type === 'Input' && n.props.onChangeText && n.props.label?.includes('Name')).props.onChangeText('Tea');
  app.render();
  const saving = app.find(n => n.type === 'Button' && n.props.title === 'Save Meal').props.onPress();
  app.unmount();
  estimate.resolve({ calories: 0, protein: 0, carbs: 0, fat: 0 }); await saving;
  assert.equal(writes, 0); assert.equal(navigations, 0);
});

test('Walking calculations preserve exact step duration and reject fractional steps', () => {
  const { walkingStats, presetCalories, waterVolume } = createLoader()('src/services/exerciseCalculations.js');
  const pace = { stepsPerMin: 105, met: 3.5, speedKmh: 4.8 };
  const walk = walkingStats('steps', '30', '1000', pace, 75);
  assert.equal(walk.mins, 1000 / 105); assert.equal(walk.steps, 1000); assert.equal(walk.calories, 44);
  for (const steps of ['0', '-1', '1.5', 'NaN', '']) assert.equal(walkingStats('steps', '30', steps, pace, 75).valid, false);
  const preset = { met: 9.8, intensity: 'high' };
  assert.ok(presetCalories(preset, 30, 'moderate', 75) < presetCalories(preset, 30, 'high', 75));
  assert.equal(waterVolume({}, '250.5 ml'), 250.5);
  assert.equal(waterVolume({}, '0.5 L'), 500);
});

test('Manual save retains the original diary date while AI estimates zero calories', async () => {
  const estimate = deferred(); let selectedDate = '2026-10-01', saved;
  const store = selector => selector({ addMeal: async meal => { saved = meal; }, logWater: async () => {} });
  store.getState = () => ({ selectedDate });
  const app = harness('src/screens/LogMealScreen.js', {
    [geminiPath]: { parseMealDescription: () => estimate.promise },
    [databasePath]: { useNutritionStore: store },
    [path.resolve('src/services/barcodeService')]: {},
  });
  app.render({ navigation: { navigate() {} } });
  app.find(n => n.type === 'TouchableOpacity' && JSON.stringify(n.props.children).includes('Manual')).props.onPress(); app.render();
  app.find(n => n.type === 'Input' && n.props.label?.includes('Name')).props.onChangeText('Tea'); app.render();
  const button = app.find(n => n.type === 'Button' && n.props.title === 'Save Meal');
  const saving = button.props.onPress();
  await button.props.onPress(); // Same-frame second tap must not start another save.
  selectedDate = '2026-09-30';
  estimate.resolve({ calories: 0, protein: 0, carbs: 0, fat: 0 }); await saving;
  assert.equal(saved.date, '2026-10-01'); assert.equal(saved.calories, 0);
});

test('Changing an exercise description invalidates its previous AI result', async () => {
  let writes = 0;
  const app = harness('src/components/AddExerciseModal.js', {
    [geminiPath]: { estimateExerciseFromText: async () => ({ exercise_name: 'Run', duration_minutes: 30, calories_burned: 300 }) },
  });
  app.render({ visible: true, onSave: async () => writes++, onClose() {} });
  app.find(n => n.type === 'TouchableOpacity' && JSON.stringify(n.props.children).includes('AI Estimate')).props.onPress(); app.render();
  app.find(n => n.type === 'Input' && n.props.multiline).props.onChangeText('Running 30 minutes'); app.render();
  await app.find(n => n.type === 'TouchableOpacity' && JSON.stringify(n.props.children).includes('Auto-Estimate')).props.onPress(); app.render();
  app.find(n => n.type === 'Input' && n.props.multiline).props.onChangeText('Stretching 10 minutes'); app.render();
  await app.find(n => n.type === 'Button').props.onPress();
  assert.equal(writes, 0); assert.equal(app.alerts.at(-1)[0], 'Not Estimated');
});

test('Quick meal estimate from a previous modal session cannot overwrite a new form', async () => {
  const estimate = deferred(); let saved;
  const app = harness('src/components/QuickAddModal.js', {
    [geminiPath]: { parseMealDescription: () => estimate.promise },
  });
  const props = { visible: true, onSave: async meal => { saved = meal; }, onClose() {} };
  app.render(props);
  app.find(n => n.type === 'Input' && n.props.onChangeText && n.props.label?.includes('Name')).props.onChangeText('Old tea'); app.render();
  const saving = app.find(n => n.type === 'Button').props.onPress();
  app.render({ ...props, visible: false }); app.render({ ...props, editMeal: { id: 7, name: 'New meal', calories: 120 } });
  estimate.resolve({ calories: 999 }); await saving; app.render();
  assert.equal(saved, undefined);
  assert.equal(app.find(n => n.type === 'Input' && n.props.label?.includes('Name')).props.value, 'New meal');
});

test('A barcode held in the camera cannot repeatedly trigger a failed lookup', async () => {
  let calls = 0;
  const app = harness('src/components/BarcodeScanner.js', {
    'expo-camera': { CameraView: 'Camera', useCameraPermissions: () => [{ granted: true }, async () => {}] },
  });
  app.render({ onScanBarcode: async () => { calls++; throw new Error('Unknown product'); } });
  const handler = app.find(n => n.type === 'Camera').props.onBarcodeScanned;
  await handler({ data: '12345678' });
  await handler({ data: '12345678' }); app.render();
  assert.equal(calls, 1);
  app.find(n => n.type === 'Button' && n.props.title === 'Scan Again').props.onPress(); app.render();
  await app.find(n => n.type === 'Camera').props.onBarcodeScanned({ data: '12345678' });
  assert.equal(calls, 2); app.unmount();
});

test('Barcode nutrition never combines unscalable serving and 100g values', () => {
  const { productToMeal } = createLoader()('src/services/barcodeNutrition.js');
  const per100 = productToMeal({ nutriments: { 'energy-kcal_100g': 500, proteins_serving: 5 } }, '12345678');
  assert.equal(per100.calories, 500); assert.equal(per100.protein, 0); assert.equal(per100.portion, '100g / 100ml');
  const serving = productToMeal({ serving_size: '1 piece', nutriments: { 'energy-kcal_serving': 80, proteins_100g: 10 } }, '12345678');
  assert.equal(serving.calories, 80); assert.equal(serving.protein, 0); assert.equal(serving.portion, '1 piece');
});

test('Quick meal same-frame double taps write only one record', async () => {
  const write = deferred(); let writes = 0;
  const app = harness('src/components/QuickAddModal.js', { [geminiPath]: {} });
  app.render({ visible: true, editMeal: { id: 1, name: 'Meal', calories: 120 },
    onSave: async () => { writes++; await write.promise; }, onClose() {} });
  const handler = app.find(n => n.type === 'Button').props.onPress;
  const saving = handler(); await handler();
  assert.equal(writes, 1); write.resolve(); await saving;
});

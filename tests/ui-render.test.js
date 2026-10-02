const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const path = require('node:path');
const createLoader = require('./load-production.cjs');

// Native presentation adapters for server-render checks of production JSX.
const element = (tag) => ({ children, accessibilityLabel }) => React.createElement(tag, { 'aria-label': accessibilityLabel }, children);
const native = {
  View: element('div'), Text: element('span'), TouchableOpacity: element('button'),
  TouchableWithoutFeedback: element('button'), ScrollView: element('div'),
  TextInput: element('input'), Image: element('img'), ActivityIndicator: element('div'),
  StyleSheet: { create: (value) => value }, Platform: { OS: 'web' },
  Animated: { View: element('div'), Value: class { interpolate() { return 0; } } },
};
const svg = { __esModule: true, default: element('svg') };
for (const name of ['Circle', 'G', 'Defs', 'LinearGradient', 'Stop']) svg[name] = element('g');
const load = createLoader({
  'react-native': native, 'react-native-svg': svg,
  '@expo/vector-icons': { Ionicons: element('span') }, 'expo-haptics': {},
  [path.resolve('src/services/databaseService')]: { formatTimeString: () => '12:00 PM' },
  [path.resolve('src/services/imageService')]: { resolveImageUriAsync: async (uri) => uri },
});

test('Calorie ring displays remaining intake including exercise credit', () => {
  const Ring = load('src/components/CalorieRing.js').default;
  const html = renderToStaticMarkup(React.createElement(Ring, { consumed: 1250, goal: 2100, burned: 340 }));
  assert.match(html, /1,190/);
  assert.match(html, /kcal remaining/);
});

test('Meal card renders edit and delete as sibling controls', () => {
  const MealCard = load('src/components/MealCard.js').default;
  const html = renderToStaticMarkup(React.createElement(MealCard, { meal: { name: 'Eggs', calories: 100, protein: 12, carbs: 1, fat: 10 }, onPress: () => {}, onDelete: () => {} }));
  assert.ok(html.startsWith('<div'));
  assert.equal((html.match(/<button/g) || []).length, 2);
  assert.match(html, /aria-label="Edit Eggs, 100 calories"/);
  assert.match(html, /aria-label="Delete Eggs"/);
});

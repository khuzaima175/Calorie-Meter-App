// Only use standardized _100g/_serving fields, not manufacturer input values.
function nutrient(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function productToMeal(product, barcode) {
  const n = product.nutriments || {};
  const size = String(product.serving_size || '');
  const match = size.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i);
  const grams = nutrient(product.serving_quantity) || (match ? nutrient(match[1].replace(',', '.')) : null);
  const factor = grams ? grams / 100 : 1;
  const per100Basis = !grams && (nutrient(n['energy-kcal_100g']) !== null || nutrient(n.energy_100g) !== null);
  const amount = (key) => {
    const perServing = nutrient(n[`${key}_serving`]);
    if (grams && perServing !== null) return perServing;
    if (!grams && !per100Basis) return perServing;
    const per100 = nutrient(n[`${key}_100g`]);
    if (per100 !== null) return per100 * factor;
    // Without a serving weight, values from the other basis cannot be scaled.
    return grams ? perServing : null;
  };
  let calories = amount('energy-kcal');
  if (calories === null) {
    const kj = amount('energy');
    if (kj !== null) calories = kj / 4.184;
  }
  if (calories === null) throw new Error('This product has no energy data. Scan its nutrition label or enter it manually.');
  const round = (value) => Math.round((value ?? 0) * 10) / 10;
  const sodium = amount('sodium') ?? ((amount('salt') ?? 0) * 0.4);
  return {
    barcode,
    name: `${product.brands ? `${product.brands} - ` : ''}${product.product_name || product.product_name_en || product.generic_name || 'Scanned Food Product'}`,
    meal_type: 'snack',
    portion: grams ? (size || `1 serving (${grams}g)`) : per100Basis ? '100g / 100ml' : size || '1 serving',
    calories: Math.round(calories), protein: round(amount('proteins')),
    carbs: round(amount('carbohydrates')), fat: round(amount('fat')),
    fiber: round(amount('fiber')), sugar: round(amount('sugars')),
    sodium: Math.round(sodium * 1000),
    image_uri: product.image_front_url || product.image_url || null,
    // Nutri-Score's scale is not the AI's 1–10 health score.
    nutriscore_grade: product.nutriscore_grade || null,
    confidence: 1, source: 'OpenFoodFacts',
  };
}

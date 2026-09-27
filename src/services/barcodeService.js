// src/services/barcodeService.js
// OpenFoodFacts REST integration with defensive kJ -> kcal calculation

/**
 * Safely extracts kcal per 100g from OpenFoodFacts nutriments payload
 */
function extractKcalPer100g(nutriments) {
  if (!nutriments) return 0;

  // 1. Direct kcal per 100g
  if (typeof nutriments['energy-kcal_100g'] === 'number') {
    return Math.round(nutriments['energy-kcal_100g']);
  }
  if (typeof nutriments['energy-kcal_value'] === 'number') {
    return Math.round(nutriments['energy-kcal_value']);
  }
  if (typeof nutriments['energy-kcal'] === 'number') {
    return Math.round(nutriments['energy-kcal']);
  }

  // 2. Fallback: energy_100g is in Joules / Kilojoules. Convert kJ -> kcal (1 kcal = 4.184 kJ)
  if (typeof nutriments['energy_100g'] === 'number') {
    const rawJoules = nutriments['energy_100g'];
    // If > 1000, it's typically Joules; if < 1000 but > 0 and unit is kJ, divide by 4.184
    return Math.round(rawJoules / 4.184);
  }

  return 0;
}

/**
 * Safely extracts serving multiplier or serving size
 */
function extractServingData(product, kcalPer100g) {
  const servingSizeStr = product.serving_size || product.serving_quantity_unit || '1 serving (100g)';
  let servingGrams = 100;

  if (typeof product.serving_quantity === 'number' && product.serving_quantity > 0) {
    servingGrams = product.serving_quantity;
  } else {
    // Attempt to parse "55g" or "250 ml" from serving_size string
    const match = servingSizeStr.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)/i);
    if (match && match[1]) {
      servingGrams = parseFloat(match[1]);
    }
  }

  const factor = servingGrams / 100;
  return {
    servingSizeStr,
    servingGrams,
    factor,
  };
}

/**
 * Searches product by barcode on OpenFoodFacts
 */
export async function lookupBarcode(barcode) {
  const cleanBarcode = String(barcode).trim();
  if (!cleanBarcode) {
    throw new Error('Please scan or enter a valid barcode.');
  }

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CalorieSnapPro - Mobile - Version 1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenFoodFacts lookup failed (${response.status})`);
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      throw new Error('Product not found in OpenFoodFacts database.');
    }

    const p = data.product;
    const nutriments = p.nutriments || {};

    const kcal100 = extractKcalPer100g(nutriments);
    const { servingSizeStr, factor } = extractServingData(p, kcal100);

    const protein100 = Number(nutriments.proteins_100g || nutriments.proteins || 0);
    const carbs100 = Number(nutriments.carbohydrates_100g || nutriments.carbohydrates || 0);
    const fat100 = Number(nutriments.fat_100g || nutriments.fat || 0);
    const fiber100 = Number(nutriments.fiber_100g || nutriments.fiber || 0);
    const sugar100 = Number(nutriments.sugars_100g || nutriments.sugars || 0);
    const sodium100 = Number(nutriments.sodium_100g || (nutriments.salt_100g ? nutriments.salt_100g * 0.4 : 0)); // Salt -> Sodium

    const productName = p.product_name || p.product_name_en || p.generic_name || 'Scanned Food Product';
    const brand = p.brands ? `${p.brands} - ` : '';

    return {
      barcode: cleanBarcode,
      name: `${brand}${productName}`.trim(),
      meal_type: 'snack',
      portion: servingSizeStr,
      calories: Math.round(kcal100 * factor),
      protein: Math.round(protein100 * factor * 10) / 10,
      carbs: Math.round(carbs100 * factor * 10) / 10,
      fat: Math.round(fat100 * factor * 10) / 10,
      fiber: Math.round(fiber100 * factor * 10) / 10,
      sugar: Math.round(sugar100 * factor * 10) / 10,
      sodium: Math.round(sodium100 * factor * 1000), // convert to mg
      image_uri: p.image_front_url || p.image_url || null,
      health_score: p.nutriscore_score ?? 7,
      confidence: 1.0,
      source: 'OpenFoodFacts',
    };
  } catch (error) {
    console.error('Barcode lookup error:', error.message);
    throw error;
  }
}

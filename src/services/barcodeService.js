import { productToMeal } from './barcodeNutrition';
export async function lookupBarcode(barcode) {
  const cleanBarcode = String(barcode).trim();
  if (!/^\d{8,14}$/.test(cleanBarcode)) throw new Error('Please enter a numeric food barcode of 8?14 digits.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(cleanBarcode) + '.json', { signal: controller.signal });
    if (!response.ok) throw new Error('OpenFoodFacts lookup failed (' + response.status + ').');
    const data = await response.json();
    if (data.status !== 1 || !data.product) throw new Error('Product not found in OpenFoodFacts database.');
    return productToMeal(data.product, cleanBarcode);
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Barcode lookup timed out. Please try again.');
    throw error;
  } finally { clearTimeout(timeout); }
}

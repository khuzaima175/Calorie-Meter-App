// Keep the entered walking quantity as the source of truth. Rounding the
// derived duration before calculating energy overstates short walks.
export function walkingStats(mode, duration, steps, pace, weight) {
  const entered = Number(mode === 'steps' ? steps : duration);
  const valid = Number.isFinite(entered) && entered > 0 &&
    (mode !== 'steps' || Number.isInteger(entered));
  const mins = valid ? (mode === 'steps' ? entered / pace.stepsPerMin : entered) : 0;
  return {
    valid: valid && mins >= 1 && mins <= 720,
    mins,
    steps: valid ? (mode === 'steps' ? entered : Math.round(mins * pace.stepsPerMin)) : 0,
    distanceKm: Number((mins * pace.speedKmh / 60).toFixed(2)),
    calories: Math.round(pace.met * 3.5 * weight / 200 * mins),
  };
}

const INTENSITY_FACTORS = { low: 0.85, moderate: 1, high: 1.2 };
export function presetCalories(preset, duration, intensity, weight) {
  const ratio = INTENSITY_FACTORS[intensity] / INTENSITY_FACTORS[preset.intensity];
  return Math.round(preset.met * ratio * 3.5 * weight / 200 * (Number(duration) || 0));
}

export function waterVolume(analysis, portion) {
  if (Number.isFinite(Number(analysis?.water_ml)) && Number(analysis.water_ml) > 0) return Number(analysis.water_ml);
  const match = String(portion).match(/(\d+(?:\.\d+)?)\s*(ml|litres?|liters?|l)\b/i);
  return match ? Number(match[1]) * (match[2].toLowerCase() === 'ml' ? 1 : 1000) : 250;
}

// Coordinates destructive data replacement without coupling persistence to UI stores.
const listeners = new Set();
export function onDataReplacement(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export async function notifyDataReplacement(phase) {
  for (const listener of listeners) await listener(phase);
}

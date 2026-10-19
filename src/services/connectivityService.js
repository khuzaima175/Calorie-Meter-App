import { AppState, Platform } from 'react-native';
import * as Network from 'expo-network';

let online = true;
const listeners = new Set();
export const isConnected = () => online;
export function subscribeConnectivity(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function startConnectivityMonitoring(onChange) {
  let mounted = true, revision = 0;
  const update = (state) => {
    if (!mounted) return;
    revision++;
    online = state.isConnected !== false && state.isInternetReachable !== false;
    onChange(online); listeners.forEach((listener) => listener(online));
  };
  const refresh = async () => {
    const request = revision;
    try { const state = await Network.getNetworkStateAsync(); if (mounted && request === revision) update(state); } catch { /* A failed reachability check is not proof of an offline device. */ }
  };
  const network = Network.addNetworkStateListener(update);
  const app = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
  let browserOnline, browserOffline;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    browserOnline = () => update({ isConnected: true }); browserOffline = () => update({ isConnected: false });
    window.addEventListener('online', browserOnline); window.addEventListener('offline', browserOffline);
  }
  void refresh();
  return () => {
    mounted = false; network.remove(); app.remove();
    if (browserOnline) { window.removeEventListener('online', browserOnline); window.removeEventListener('offline', browserOffline); }
  };
}

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const createLoader = require('./load-production.cjs');
const tick = () => new Promise(setImmediate);

test('Connectivity ignores stale reachability reads, refreshes on resume, and detaches on shutdown', async () => {
  const reads = [], changes = []; let networkEvent, appEvent, detached = 0;
  const load = createLoader({
    'react-native': { Platform: { OS: 'android' }, AppState: { addEventListener: (_, cb) => { appEvent = cb; return { remove: () => detached++ }; } } },
    'expo-network': { getNetworkStateAsync: () => new Promise(resolve => reads.push(resolve)),
      addNetworkStateListener: cb => { networkEvent = cb; return { remove: () => detached++ }; } },
  });
  const service = load('src/services/connectivityService.js');
  const stop = service.startConnectivityMonitoring(value => changes.push(value));
  networkEvent({ isConnected: false });
  reads[0]({ isConnected: true }); await tick();
  assert.deepEqual(changes, [false]);
  appEvent('active'); reads[1]({ isConnected: true, isInternetReachable: true }); await tick();
  assert.deepEqual(changes, [false, true]);
  appEvent('active'); stop(); reads[2]({ isConnected: false }); await tick();
  assert.deepEqual(changes, [false, true]); assert.equal(detached, 2);
});

test('Scan notifications use existing permission, route cold/warm taps by job ID, and detach safely', async () => {
  let state = 'active', permission = 'granted', responseListener, detached = false;
  const scheduled = [], opened = [];
  const load = createLoader({
    'react-native': { Platform: { OS: 'android' }, AppState: { get currentState() { return state; } } },
    [path.resolve('src/services/databaseService')]: { getSetting: async () => null, setSetting: async () => {} },
    'expo-notifications': {
      setNotificationHandler() {}, AndroidImportance: { DEFAULT: 3 },
      getPermissionsAsync: async () => ({ status: permission }), setNotificationChannelAsync: async () => {},
      requestPermissionsAsync: () => { throw new Error('Scan completion must never request permission'); },
      scheduleNotificationAsync: async item => scheduled.push(item),
      addNotificationResponseReceivedListener: cb => { responseListener = cb; return { remove: () => { detached = true; } }; },
      getLastNotificationResponseAsync: async () => ({ notification: { request: { content: { data: { scanJobId: 'cold-scan' } } } } }),
    },
  });
  const service = load('src/services/notificationService.js');
  assert.equal(await service.notifyScanReady('scan-1'), false);
  state = 'background'; permission = 'denied'; assert.equal(await service.notifyScanReady('scan-1'), false);
  permission = 'granted'; assert.equal(await service.notifyScanReady('scan-1'), true);
  assert.equal(scheduled.length, 1); assert.equal(scheduled[0].content.data.scanJobId, 'scan-1');
  const stop = service.subscribeToScanNotifications(id => opened.push(id)); await tick();
  responseListener({ notification: { request: { content: { data: { scanJobId: 'warm-scan' } } } } });
  stop(); responseListener({ notification: { request: { content: { data: { scanJobId: 'late-scan' } } } } });
  assert.deepEqual(opened, ['cold-scan', 'warm-scan']); assert.equal(detached, true);
});

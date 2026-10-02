// src/App.js
// CalorieSnap Pro — App Bootstrapper & Root Component

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { initDatabase, getTodayString } from './services/databaseService';
import { useProfileStore } from './stores/useProfileStore';
import { useNutritionStore } from './stores/useNutritionStore';
import TabNavigator from './navigation/TabNavigator';
import LoadingShimmer from './components/LoadingShimmer';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import Button from './components/Button';
import { colors } from './theme/colors';

// Ensure full viewport on Web browser
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleTag = document.getElementById('expo-web-root-styles');
  if (!styleTag) {
    const style = document.createElement('style');
    style.id = 'expo-web-root-styles';
    style.textContent = `
      html, body, #root {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
        background-color: #121214;
        display: flex;
        flex-direction: column;
        overflow-x: hidden;
      }
    `;
    document.head.appendChild(style);
  }
}

function AppBootstrapper() {
  const [isReady, setIsReady] = useState(false);
  const [bootError, setBootError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    setBootError(null);
    async function bootstrap() {
      try {
        // 1. Initialize SQLite Database & run schema migrations
        await initDatabase();

        // 2. Hydrate user profile and goals into Zustand state
        await useProfileStore.getState().loadProfile();

        // 3. Hydrate today's nutrition logs into Zustand state
        await useNutritionStore.getState().refreshData(getTodayString());
        const loadError = useNutritionStore.getState().error;
        if (loadError) throw new Error(loadError);

        if (mounted) setIsReady(true);
      } catch (err) {
        console.error('Failed during app bootstrapping:', err);
        if (mounted) setBootError(err.message || 'Could not load your saved data.');
      }
    }

    bootstrap();
    return () => { mounted = false; };
  }, [attempt]);

  if (bootError) {
    return <View style={styles.bootContainer}>
      <Text style={{ color: colors.textPrimary, padding: 24, textAlign: 'center' }}>{bootError}</Text>
      <Button title="Retry Loading" onPress={() => setAttempt((value) => value + 1)} />
    </View>;
  }

  if (!isReady) {
    return (
      <View style={styles.bootContainer}>
        <StatusBar style="light" backgroundColor="transparent" translucent />
        <LoadingShimmer />
      </View>
    );
  }

  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <View style={styles.mobileShell}>
        <OfflineBanner />
        <TabNavigator />
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ErrorBoundary>
        <AppBootstrapper />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bootContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#09090B',
    ...(Platform.OS === 'web'
      ? { alignItems: 'center', justifyContent: 'center' }
      : { alignItems: 'stretch' }),
  },
  mobileShell: {
    flex: 1,
    maxWidth: Platform.OS === 'web' ? 460 : undefined,
    width: '100%',
    backgroundColor: colors.background,
  },
});

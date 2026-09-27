// src/App.js
// CalorieSnap Pro — App Bootstrapper & Root Component

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initDatabase, getTodayString } from './services/databaseService';
import { useProfileStore } from './stores/useProfileStore';
import { useNutritionStore } from './stores/useNutritionStore';
import TabNavigator from './navigation/TabNavigator';
import LoadingShimmer from './components/LoadingShimmer';
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

  useEffect(() => {
    async function bootstrap() {
      try {
        // 1. Initialize SQLite Database & run schema migrations
        await initDatabase();

        // 2. Hydrate user profile and goals into Zustand state
        await useProfileStore.getState().loadProfile();

        // 3. Hydrate today's nutrition logs into Zustand state
        await useNutritionStore.getState().refreshData(getTodayString());

        setIsReady(true);
      } catch (err) {
        console.error('Failed during app bootstrapping:', err);
        // Even on error, proceed to render UI
        setIsReady(true);
      }
    }

    bootstrap();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.bootContainer}>
        <StatusBar style="light" />
        <LoadingShimmer />
      </View>
    );
  }

  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" />
      <View style={styles.mobileShell}>
        <TabNavigator />
      </View>
    </View>
  );
}

export default function App() {
  return <AppBootstrapper />;
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileShell: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 460 : undefined,
    backgroundColor: colors.background,
    position: 'relative',
    overflow: 'hidden',
  },
});


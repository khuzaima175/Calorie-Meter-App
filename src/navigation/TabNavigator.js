// src/navigation/TabNavigator.js
// Custom sleek bottom tab navigator with center action button and haptic feedback

import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DashboardScreen from '../screens/DashboardScreen';
import LogMealScreen from '../screens/LogMealScreen';
import ActivityScreen from '../screens/ActivityScreen';
import AssistantScreen from '../screens/AssistantScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors, radius, shadows, typography } from '../theme/colors';

const TABS = [
  { key: 'Dashboard', label: 'Today', icon: 'home-outline', activeIcon: 'home' },
  { key: 'Activity', label: 'Activity', icon: 'flame-outline', activeIcon: 'flame' },
  { key: 'LogMeal', label: 'Log', isCenterAction: true, icon: 'add' },
  { key: 'Assistant', label: 'Sage AI', icon: 'leaf-outline', activeIcon: 'leaf' },
  { key: 'Settings', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

export default function TabNavigator() {
  const [activeRoute, setActiveRoute] = useState('Dashboard');
  const centerBtnScale = useRef(new Animated.Value(1)).current;

  const handleTabPress = (routeKey) => {
    Haptics.impactAsync(
      routeKey === 'LogMeal'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    ).catch(() => {});

    // Bounce the center button when pressed
    if (routeKey === 'LogMeal') {
      Animated.sequence([
        Animated.spring(centerBtnScale, {
          toValue: 0.85,
          useNativeDriver: true,
          speed: 50,
        }),
        Animated.spring(centerBtnScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8,
        }),
      ]).start();
    }

    setActiveRoute(routeKey);
  };

  const navigationMock = {
    navigate: (route) => handleTabPress(route),
  };

  const renderActiveScreen = () => {
    switch (activeRoute) {
      case 'Dashboard':
        return <DashboardScreen navigation={navigationMock} />;
      case 'LogMeal':
        return <LogMealScreen navigation={navigationMock} />;
      case 'Activity':
        return <ActivityScreen navigation={navigationMock} />;
      case 'Assistant':
        return <AssistantScreen navigation={navigationMock} />;
      case 'Settings':
        return <SettingsScreen navigation={navigationMock} />;
      default:
        return <DashboardScreen navigation={navigationMock} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Active Screen View */}
      <View style={styles.screenWrapper}>{renderActiveScreen()}</View>

      {/* Floating Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeRoute === tab.key;

          if (tab.isCenterAction) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.centerBtnOuter}
                onPress={() => handleTabPress(tab.key)}
                activeOpacity={0.85}
              >
                <Animated.View style={[styles.centerBtnInner, { transform: [{ scale: centerBtnScale }] }]}>
                  <Ionicons name="camera-outline" size={22} color={colors.textInverse} />
                </Animated.View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={22}
                color={isActive ? colors.sageBright : colors.textTertiary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeIndicatorDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenWrapper: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 12,
    left: 16,
    right: 16,
    height: 64,
    backgroundColor: colors.cardBackground,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    ...shadows.floating,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  tabLabel: {
    ...typography.micro,
    color: colors.textTertiary,
    marginTop: 3,
    fontSize: 10,
    textTransform: 'none',
  },
  tabLabelActive: {
    color: colors.sageBright,
    fontWeight: '700',
  },
  centerBtnOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.sageBright,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    ...shadows.card,
    borderWidth: 3,
    borderColor: colors.background,
  },
  centerBtnInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.sageBright,
    marginTop: 3,
  },
});

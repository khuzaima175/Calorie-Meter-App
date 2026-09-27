// src/components/LoadingShimmer.js
// Warm glowing skeleton placeholder for bootstrapping and screen transitions

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, radius } from '../theme/colors';

export default function LoadingShimmer() {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.75,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <View style={styles.container}>
      {/* Header bar placeholder */}
      <View style={styles.headerRow}>
        <Animated.View style={[styles.titleSkeleton, { opacity: opacityAnim }]} />
        <Animated.View style={[styles.avatarSkeleton, { opacity: opacityAnim }]} />
      </View>

      {/* Date bar placeholder */}
      <Animated.View style={[styles.dateBarSkeleton, { opacity: opacityAnim }]} />

      {/* Hero Calorie Card Placeholder */}
      <Animated.View style={[styles.heroCardSkeleton, { opacity: opacityAnim }]}>
        <View style={styles.ringPlaceholder} />
        <View style={styles.macroPillRow}>
          <View style={styles.macroPill} />
          <View style={styles.macroPill} />
          <View style={styles.macroPill} />
        </View>
      </Animated.View>

      {/* Water & Workout Tracker Placeholder */}
      <View style={styles.splitRow}>
        <Animated.View style={[styles.halfCardSkeleton, { opacity: opacityAnim }]} />
        <Animated.View style={[styles.halfCardSkeleton, { opacity: opacityAnim }]} />
      </View>

      {/* Meal Section Placeholder */}
      <Animated.View style={[styles.mealCardSkeleton, { opacity: opacityAnim }]} />
      <Animated.View style={[styles.mealCardSkeleton, { opacity: opacityAnim }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 56,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleSkeleton: {
    width: 140,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.cardElevated,
  },
  avatarSkeleton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.cardElevated,
  },
  dateBarSkeleton: {
    width: '100%',
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.cardBackground,
    marginBottom: 16,
  },
  heroCardSkeleton: {
    height: 240,
    borderRadius: radius.lg,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginBottom: 16,
  },
  ringPlaceholder: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 12,
    borderColor: colors.cardElevated,
    marginBottom: 20,
  },
  macroPillRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  macroPill: {
    width: '30%',
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.cardElevated,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfCardSkeleton: {
    width: '48%',
    height: 100,
    borderRadius: radius.lg,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  mealCardSkeleton: {
    width: '100%',
    height: 70,
    borderRadius: radius.lg,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
});

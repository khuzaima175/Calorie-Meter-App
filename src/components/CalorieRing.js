// src/components/CalorieRing.js
// Circular SVG Calorie Ring with smooth animated stroke fill and remaining count
// Cross-platform compatible (iOS, Android, and Web)

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, typography } from '../theme/colors';

export default function CalorieRing({
  consumed = 0,
  goal = 2000,
  burned = 0,
  size = 180,
  strokeWidth = 14,
}) {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Remaining calories calculation
  const netConsumed = Math.max(0, consumed);
  const remaining = goal - netConsumed;
  const percentage = goal > 0 ? Math.min(1.2, netConsumed / goal) : 0;
  const isOver = remaining < 0;

  const [strokeDashoffset, setStrokeDashoffset] = useState(
    circumference * (1 - Math.min(1, percentage))
  );

  useEffect(() => {
    const listenerId = animatedProgress.addListener(({ value }) => {
      const clampedVal = Math.min(1, Math.max(0, value));
      setStrokeDashoffset(circumference * (1 - clampedVal));
    });

    Animated.spring(animatedProgress, {
      toValue: percentage,
      useNativeDriver: false,
      damping: 18,
      stiffness: 90,
      mass: 0.8,
    }).start();

    return () => {
      animatedProgress.removeListener(listenerId);
    };
  }, [percentage, animatedProgress, circumference]);

  const ringColor = isOver ? colors.caloriesBurned : colors.sagePrimary;
  const ringEndColor = isOver ? colors.error : colors.sageBright;
  const center = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="calorieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={ringColor} />
            <Stop offset="100%" stopColor={ringEndColor} />
          </LinearGradient>
        </Defs>

        <G transform={`rotate(-90 ${center} ${center})`}>
          {/* Background Track Circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.cardElevated}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress Circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#calorieGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>

      {/* Center Label & Remaining Number */}
      <View style={styles.innerContent}>
        <Text style={[styles.remainingNumber, isOver && styles.overNumber]}>
          {Math.abs(Math.round(remaining)).toLocaleString()}
        </Text>
        <Text style={styles.remainingLabel}>
          {isOver ? 'kcal over' : 'kcal remaining'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  innerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remainingNumber: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  overNumber: {
    color: colors.caloriesBurned,
  },
  remainingLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: -2,
    fontWeight: '500',
  },
});

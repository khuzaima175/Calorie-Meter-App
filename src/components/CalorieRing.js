// src/components/CalorieRing.js
// Circular SVG Calorie Ring with spring animated stroke fill and remaining count

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, typography } from '../theme/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

  useEffect(() => {
    Animated.spring(animatedProgress, {
      toValue: percentage,
      useNativeDriver: true,
      damping: 18,
      stiffness: 90,
      mass: 0.8,
    }).start();
  }, [percentage, animatedProgress]);

  // Stroke Dashoffset interpolation
  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const ringColor = isOver ? colors.caloriesBurned : colors.sagePrimary;
  const ringEndColor = isOver ? colors.error : colors.sageBright;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="calorieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={ringColor} />
            <Stop offset="100%" stopColor={ringEndColor} />
          </LinearGradient>
        </Defs>

        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background Track Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.cardElevated}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Animated Progress Circle */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#calorieGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
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

// src/components/MacroBar.js
// Earth-Tone Macronutrient Progress Bars (Protein, Carbs, Fat)

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, radius, typography } from '../theme/colors';

function SingleMacroItem({
  label,
  current = 0,
  goal = 100,
  color,
  bgColor,
  unit = 'g',
}) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const percentage = goal > 0 ? Math.min(1, current / goal) : 0;
  const percentDisplay = Math.round((current / (goal || 1)) * 100);

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: percentage,
      useNativeDriver: false,
      damping: 18,
      stiffness: 100,
    }).start();
  }, [percentage, widthAnim]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.macroItem}>
      <View style={styles.headerRow}>
        <View style={styles.labelGroup}>
          <View style={[styles.colorDot, { backgroundColor: color }]} />
          <Text style={styles.labelText}>{label}</Text>
        </View>
        <Text style={styles.valueText}>
          <Text style={[styles.boldValue, { color }]}>{Math.round(current)}</Text>
          <Text style={styles.goalValue}> / {Math.round(goal)}{unit}</Text>
        </Text>
      </View>

      {/* Track & Bar */}
      <View style={[styles.track, { backgroundColor: bgColor || colors.cardElevated }]}>
        <Animated.View
          style={[
            styles.fillBar,
            {
              backgroundColor: color,
              width: animatedWidth,
            },
          ]}
        />
      </View>

      <Text style={styles.percentText}>{percentDisplay}%</Text>
    </View>
  );
}

export default function MacroBar({
  protein = 0,
  proteinGoal = 140,
  carbs = 0,
  carbsGoal = 220,
  fat = 0,
  fatGoal = 65,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <SingleMacroItem
        label="Protein"
        current={protein}
        goal={proteinGoal}
        color={colors.protein}
        bgColor={colors.proteinBg}
      />
      <SingleMacroItem
        label="Carbs"
        current={carbs}
        goal={carbsGoal}
        color={colors.carbs}
        bgColor={colors.carbsBg}
      />
      <SingleMacroItem
        label="Fat"
        current={fat}
        goal={fatGoal}
        color={colors.fat}
        bgColor={colors.fatBg}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 4,
  },
  macroItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  headerRow: {
    flexDirection: 'column',
    marginBottom: 6,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  colorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  labelText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  valueText: {
    fontSize: 13,
  },
  boldValue: {
    fontWeight: '700',
  },
  goalValue: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  track: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
    width: '100%',
  },
  fillBar: {
    height: '100%',
    borderRadius: radius.full,
  },
  percentText: {
    ...typography.micro,
    color: colors.textTertiary,
    marginTop: 4,
    fontSize: 9,
  },
});

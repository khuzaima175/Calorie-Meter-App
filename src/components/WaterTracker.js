import { Alert } from '../services/alertService';
// src/components/WaterTracker.js
// Interactive Water Intake Tracker with liquid wave physics, droplet animation, and haptics

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors, radius, typography } from '../theme/colors';

export default function WaterTracker({
  current = 0,
  goal = 2500,
  onAddWater,
  onUndoWater,
  style,
}) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const dropletAnim = useRef(new Animated.Value(0)).current;

  const percentage = goal > 0 ? Math.min(1, current / goal) : 0;
  const percentDisplay = Math.round(percentage * 100);

  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: percentage,
      useNativeDriver: false,
      damping: 15,
      stiffness: 80,
    }).start();
  }, [percentage, fillAnim]);

  const triggerDropletAnimation = () => {
    dropletAnim.setValue(0);
    Animated.sequence([
      Animated.timing(dropletAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(dropletAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAdd = (amount) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    triggerDropletAnimation();
    Promise.resolve(onAddWater(amount)).catch((error) => Alert.alert('Water Log Failed', error.message));
  };

  const handleUndo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Promise.resolve(onUndoWater()).catch((error) => Alert.alert('Undo Failed', error.message));
  };

  const animatedHeight = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.card, style]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.waterIconCircle}>
            <Ionicons name="water" size={16} color={colors.water} />
          </View>
          <Text style={styles.titleText}>Hydration</Text>
        </View>

        <Text style={styles.progressPercent}>{percentDisplay}% of goal</Text>
      </View>

      {/* Main visual & numbers */}
      <View style={styles.bodyRow}>
        {/* Animated Water Cup / Vial */}
        <View style={styles.vialContainer}>
          <Animated.View
            style={[
              styles.vialFill,
              {
                height: animatedHeight,
              },
            ]}
          >
            {/* Wave crest */}
            <Svg width="100%" height={10} viewBox="0 0 100 10" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="waterWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#78ABF4" />
                  <Stop offset="100%" stopColor={colors.water} />
                </LinearGradient>
              </Defs>
              <Path
                d="M 0,5 Q 25,0 50,5 T 100,5 L 100,10 L 0,10 Z"
                fill="url(#waterWaveGrad)"
              />
            </Svg>
          </Animated.View>

          {/* Droplet animation */}
          <Animated.View
            style={[
              styles.droplet,
              {
                opacity: dropletAnim,
                transform: [
                  {
                    translateY: dropletAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 18],
                    }),
                  },
                  {
                    scale: dropletAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.6, 1.2, 0.8],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="water" size={14} color="#78ABF4" />
          </Animated.View>
        </View>

        {/* Value details */}
        <View style={styles.statsColumn}>
          <View style={styles.valueRow}>
            <Text style={styles.currentValue}>{current.toLocaleString()}</Text>
            <Text style={styles.unitText}> ml</Text>
          </View>
          <Text style={styles.goalText}>Target: {goal.toLocaleString()} ml</Text>
          <Text style={styles.glassCountText}>
            ≈ {Math.round(current / 250)} of {Math.round(goal / 250)} glasses
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.quickAddBtn}
          onPress={() => handleAdd(250)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add 250 milliliters of water"
        >
          <Ionicons name="add" size={16} color={colors.water} />
          <Text style={styles.quickAddText}>+250 ml</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAddBtn}
          onPress={() => handleAdd(500)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add 500 milliliters of water"
        >
          <Ionicons name="add" size={16} color={colors.water} />
          <Text style={styles.quickAddText}>+500 ml</Text>
        </TouchableOpacity>

        {current > 0 && (
          <TouchableOpacity
            style={styles.undoBtn}
            onPress={handleUndo}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Undo last water intake log"
          >
            <Ionicons name="remove-circle-outline" size={22} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterIconCircle: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.waterBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  titleText: {
    ...typography.title3,
    fontSize: 16,
  },
  progressPercent: {
    ...typography.caption,
    color: colors.water,
    fontWeight: '600',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  vialContainer: {
    width: 44,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.cardElevated,
    borderWidth: 1.5,
    borderColor: 'rgba(91, 146, 229, 0.3)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
    marginRight: 16,
  },
  vialFill: {
    width: '100%',
    backgroundColor: colors.water,
  },
  droplet: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
  },
  statsColumn: {
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentValue: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  unitText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  goalText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  glassCountText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.waterBg,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    marginRight: 10,
  },
  quickAddText: {
    ...typography.callout,
    color: colors.water,
    fontWeight: '600',
    marginLeft: 4,
  },
  undoBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
});

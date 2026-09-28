// src/components/ExerciseCard.js
// Workout entry card with burned calories, duration, and intensity tags

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, typography } from '../theme/colors';
import { formatTimeString } from '../services/databaseService';

const CATEGORY_ICONS = {
  cardio: { icon: 'flame-outline', color: '#E07A5F' },
  strength: { icon: 'barbell-outline', color: '#C9956B' },
  flexibility: { icon: 'body-outline', color: '#81B29A' },
  sports: { icon: 'football-outline', color: '#7BA7BC' },
};

export default function ExerciseCard({ exercise, onDelete }) {
  const catConfig = CATEGORY_ICONS[exercise.category] || CATEGORY_ICONS.cardio;

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      'Delete Exercise',
      `Remove "${exercise.exercise_name}" from activity log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            onDelete(exercise.id);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.leftRow}>
        <View style={[styles.iconBox, { backgroundColor: `${catConfig.color}20` }]}>
          <Ionicons name={catConfig.icon} size={18} color={catConfig.color} />
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.nameText} numberOfLines={1}>
            {exercise.exercise_name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.durationText}>{exercise.duration_minutes} mins</Text>
            <Text style={styles.metaDot}> • </Text>
            <View style={[styles.intensityPill, { backgroundColor: colors.cardBackground }]}>
              <Text style={styles.intensityText}>{exercise.intensity || 'moderate'}</Text>
            </View>
            <Text style={styles.metaDot}> • </Text>
            <Text style={styles.timeText}>{formatTimeString(exercise.timestamp)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.rightRow}>
        <View style={styles.burnContainer}>
          <Text style={styles.burnNumber}>-{Math.round(exercise.calories_burned)}</Text>
          <Text style={styles.burnUnit}>kcal</Text>
        </View>

        {onDelete && (
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${exercise.exercise_name}`}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 8,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoCol: {
    flex: 1,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  durationText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  metaDot: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  intensityPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  intensityText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  timeText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 11,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  burnContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  burnNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.caloriesBurned,
  },
  burnUnit: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: -2,
  },
  deleteBtn: {
    padding: 4,
  },
});

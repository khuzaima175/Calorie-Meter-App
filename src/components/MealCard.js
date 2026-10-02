import { Alert } from '../services/alertService';
// src/components/MealCard.js
// Clean meal entry card with calories, macro tags, time, and delete action

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, typography } from '../theme/colors';
import { formatTimeString } from '../services/databaseService';
import { resolveImageUriAsync } from '../services/imageService';

export default function MealCard({ meal, onDelete, onPress }) {
  const [displayImageUri, setDisplayImageUri] = useState(meal?.image_uri || null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl = null;
    setDisplayImageUri(null);
    resolveImageUriAsync(meal?.image_uri).then((resolved) => {
      if (resolved?.startsWith('blob:') && meal?.image_uri?.startsWith('indexeddb://')) objectUrl = resolved;
      if (isMounted) setDisplayImageUri(resolved);
      else if (objectUrl) URL.revokeObjectURL(objectUrl);
    });
    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [meal?.image_uri]);
  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      'Delete Meal',
      `Are you sure you want to remove "${meal.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            return onDelete(meal.id);
          },
        },
      ]
    );
  };

  return (
    <View
      style={styles.card}
    >
      <View style={styles.topRow}>
        {displayImageUri ? (
          <Image source={{ uri: displayImageUri }} style={styles.thumbnail} accessibilityLabel={`${meal.name} photo`} />
        ) : null}

        <TouchableOpacity style={styles.infoContainer} onPress={() => onPress?.(meal)}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${meal.name}, ${Math.round(meal.calories)} calories`}
          accessibilityHint="Tap to edit meal details">
          <Text style={styles.mealName} numberOfLines={1}>
            {meal.name}
          </Text>
          <View style={styles.metaRow}>
            {meal.portion ? (
              <Text style={styles.portionText}>{meal.portion}</Text>
            ) : null}
            <Text style={styles.timeText}> • {formatTimeString(meal.timestamp)}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.calorieContainer}>
          <Text style={styles.calorieNumber}>{Math.round(meal.calories)}</Text>
          <Text style={styles.calorieUnit}>kcal</Text>
        </View>

        {onDelete && (
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${meal.name}`}
          >
            <Ionicons name="trash-outline" size={17} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Macro Badges Row */}
      <View style={styles.macroBadgeRow}>
        <View style={[styles.macroPill, { backgroundColor: colors.proteinBg }]}>
          <Text style={[styles.macroText, { color: colors.protein }]}>
            P {Math.round(meal.protein)}g
          </Text>
        </View>

        <View style={[styles.macroPill, { backgroundColor: colors.carbsBg }]}>
          <Text style={[styles.macroText, { color: colors.carbs }]}>
            C {Math.round(meal.carbs)}g
          </Text>
        </View>

        <View style={[styles.macroPill, { backgroundColor: colors.fatBg }]}>
          <Text style={[styles.macroText, { color: colors.fat }]}>
            F {Math.round(meal.fat)}g
          </Text>
        </View>

        {meal.fiber > 0 && (
          <View style={[styles.macroPill, { backgroundColor: 'rgba(168, 184, 120, 0.15)' }]}>
            <Text style={[styles.macroText, { color: colors.fiber }]}>
              Fib {Math.round(meal.fiber)}g
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  thumbnail: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    marginRight: 10,
    backgroundColor: colors.cardBackground,
  },
  infoContainer: {
    flex: 1,
    marginRight: 8,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  portionText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  timeText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 12,
  },
  calorieContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  calorieNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  calorieUnit: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: -2,
  },
  deleteBtn: {
    padding: 4,
  },
  macroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  macroPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginRight: 6,
  },
  macroText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

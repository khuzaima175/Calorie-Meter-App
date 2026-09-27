// src/components/DaySelector.js
// Horizontal day navigator with spring transitions and date-fns integration

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseISO, format, isToday, isYesterday, isTomorrow, addDays, subDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors, radius, typography } from '../theme/colors';

export default function DaySelector({ selectedDate, onSelectDate }) {
  const currentDate = parseISO(selectedDate);

  const getDayLabel = () => {
    if (isToday(currentDate)) return 'Today';
    if (isYesterday(currentDate)) return 'Yesterday';
    if (isTomorrow(currentDate)) return 'Tomorrow';
    return format(currentDate, 'EEEE');
  };

  const getFormattedDate = () => {
    return format(currentDate, 'MMM d, yyyy');
  };

  const handlePrevDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const prev = subDays(currentDate, 1);
    onSelectDate(format(prev, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = addDays(currentDate, 1);
    onSelectDate(format(next, 'yyyy-MM-dd'));
  };

  const handleResetToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSelectDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const isCurrentDayToday = isToday(currentDate);

  return (
    <View style={styles.container}>
      {/* Left chevron */}
      <TouchableOpacity
        onPress={handlePrevDay}
        style={styles.arrowButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Date display center */}
      <View style={styles.dateCenter}>
        <View style={styles.labelRow}>
          <Text style={styles.dayLabel}>{getDayLabel()}</Text>
          {!isCurrentDayToday && (
            <TouchableOpacity onPress={handleResetToday} style={styles.todayPill}>
              <Text style={styles.todayPillText}>Jump to Today</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.dateSubtitle}>{getFormattedDate()}</Text>
      </View>

      {/* Right chevron */}
      <TouchableOpacity
        onPress={handleNextDay}
        style={styles.arrowButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenter: {
    alignItems: 'center',
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  todayPill: {
    backgroundColor: colors.sageSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginLeft: 8,
  },
  todayPillText: {
    ...typography.micro,
    color: colors.sageBright,
    fontSize: 9,
  },
  dateSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
});

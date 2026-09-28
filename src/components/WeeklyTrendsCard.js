// src/components/WeeklyTrendsCard.js
// 7-day nutritional trend visualizer with daily averages, target goal line, and deficit/surplus indicators

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { parseISO, format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { get7DaySummary } from '../services/databaseService';
import Card from './Card';
import { colors, radius, typography } from '../theme/colors';

export default function WeeklyTrendsCard({ selectedDate, targetCalories = 2000, onSelectDate }) {
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadTrends() {
      try {
        const data = await get7DaySummary(selectedDate);
        if (isMounted) {
          setWeeklyData(data);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed to load weekly trends:', err);
      }
    }
    loadTrends();
    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  if (loading || !weeklyData || weeklyData.length === 0) {
    return null;
  }

  const maxCal = Math.max(targetCalories * 1.25, ...weeklyData.map((d) => d.calories || 0), 2200);
  const totalCal = weeklyData.reduce((acc, d) => acc + (d.calories || 0), 0);
  const avgCal = Math.round(totalCal / weeklyData.length);
  const diffFromTarget = avgCal - targetCalories;

  return (
    <Card style={styles.card}>
      {/* Header & 7-Day Average Metric */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>7-Day Intake Trends</Text>
          <Text style={styles.subtitle}>Daily calories vs {targetCalories} kcal target</Text>
        </View>

        <View style={styles.avgBadge}>
          <Text style={styles.avgVal}>{avgCal}</Text>
          <Text style={styles.avgUnit}>avg kcal/day</Text>
        </View>
      </View>

      {/* 7-Day Bar Chart */}
      <View style={styles.chartContainer}>
        {/* Target threshold horizontal dashed line */}
        <View
          style={[
            styles.targetLine,
            {
              bottom: `${Math.min(92, Math.max(10, (targetCalories / maxCal) * 100))}%`,
            },
          ]}
        >
          <View style={styles.targetDashes} />
          <Text style={styles.targetLineLabel}>Goal</Text>
        </View>

        <View style={styles.barsRow}>
          {weeklyData.map((dayItem, idx) => {
            const cal = dayItem.calories || 0;
            const heightPercent = Math.min(100, Math.max(6, (cal / maxCal) * 100));
            const isSelected = dayItem.date === selectedDate;
            const parsed = parseISO(dayItem.date);
            const dayLabel = format(parsed, 'EEE');
            const isOver = cal > targetCalories;

            return (
              <TouchableOpacity
                key={dayItem.date || idx}
                style={styles.barCol}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  if (onSelectDate) onSelectDate(dayItem.date);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${heightPercent}%`,
                        backgroundColor: isSelected
                          ? colors.sageBright
                          : isOver
                          ? 'rgba(231, 111, 81, 0.75)'
                          : 'rgba(107, 155, 125, 0.45)',
                      },
                      isSelected && styles.barFillSelected,
                    ]}
                  />
                </View>
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                  {dayLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Footer Insight */}
      <View style={styles.footerRow}>
        <Ionicons
          name={diffFromTarget <= 0 ? 'checkmark-circle' : 'information-circle'}
          size={14}
          color={diffFromTarget <= 0 ? colors.sageBright : colors.caloriesConsumed}
        />
        <Text style={styles.footerText}>
          {diffFromTarget <= 0
            ? `${Math.abs(diffFromTarget)} kcal/day average deficit over past 7 days.`
            : `${diffFromTarget} kcal/day average surplus over past 7 days.`}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    ...typography.title3,
    fontSize: 15,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 1,
  },
  avgBadge: {
    alignItems: 'flex-end',
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  avgVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.sageBright,
  },
  avgUnit: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: -2,
  },
  chartContainer: {
    height: 110,
    position: 'relative',
    marginVertical: 6,
    justifyContent: 'flex-end',
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  targetDashes: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  targetLineLabel: {
    ...typography.micro,
    color: colors.textTertiary,
    fontSize: 8,
    marginLeft: 4,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 85,
    zIndex: 2,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 14,
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.full,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: radius.full,
  },
  barFillSelected: {
    shadowColor: colors.sageBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  dayText: {
    ...typography.micro,
    color: colors.textTertiary,
    marginTop: 6,
    fontSize: 10,
  },
  dayTextSelected: {
    color: colors.sageBright,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  footerText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 6,
  },
});

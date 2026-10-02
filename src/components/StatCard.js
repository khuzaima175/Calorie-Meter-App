// src/components/StatCard.js
// Compact metric card with tinted icon, value, label, and trend indicator

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius, typography } from '../theme/colors';

export default function StatCard({
  icon,
  iconBgColor = colors.sageSubtle,
  value,
  unit,
  label,
  subtitle,
  onPress,
  style,
}) {
  const content = (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          {icon}
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.valueText}>{value}</Text>
        {unit ? <Text style={styles.unitText}>{unit}</Text> : null}
      </View>

      <Text style={styles.labelText}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    flex: 1,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  valueText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  unitText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  labelText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

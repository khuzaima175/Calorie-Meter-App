// src/components/Card.js
// Elevated warm charcoal card component with subtle border and optional press interaction

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius, shadows } from '../theme/colors';

export default function Card({
  children,
  style,
  onPress,
  elevated = false,
  noPadding = false,
  activeOpacity = 0.75,
}) {
  const cardStyles = [
    styles.card,
    elevated && styles.elevated,
    noPadding && styles.noPadding,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity accessibilityRole="button"
        style={cardStyles}
        onPress={onPress}
        activeOpacity={activeOpacity}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    ...shadows.card,
  },
  elevated: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderLight,
  },
  noPadding: {
    padding: 0,
  },
});

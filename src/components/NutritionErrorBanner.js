import React from 'react';
import { View, Text } from 'react-native';
import { useNutritionStore } from '../stores/useNutritionStore';
import Button from './Button';
import { colors } from '../theme/colors';

export default function NutritionErrorBanner() {
  const error = useNutritionStore((state) => state.error);
  const refreshData = useNutritionStore((state) => state.refreshData);
  if (!error) return null;
  return <View style={{ padding: 12, marginBottom: 12 }}>
    <Text accessibilityRole="alert" style={{ color: colors.error, marginBottom: 8 }}>{error}</Text>
    <Button title="Retry Loading Logs" onPress={() => refreshData()} size="sm" />
  </View>;
}

// src/components/Button.js
// Interactive button with spring scale press feedback and haptics

import React, { useRef } from 'react';
import {
  Text,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  ActivityIndicator,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius } from '../theme/colors';

export default function Button({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  iconLeft,
  iconRight,
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  accessibilityHint,
  ...rest
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  const getContainerStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primary;
      case 'secondary':
        return styles.secondary;
      case 'outline':
        return styles.outline;
      case 'danger':
        return styles.danger;
      case 'ghost':
        return styles.ghost;
      default:
        return styles.primary;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'danger':
        return styles.dangerText;
      case 'ghost':
        return styles.ghostText;
      default:
        return styles.primaryText;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.sizeSm;
      case 'lg':
        return styles.sizeLg;
      default:
        return styles.sizeMd;
    }
  };

  const getTextSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.textSm;
      case 'lg':
        return styles.textLg;
      default:
        return styles.textMd;
    }
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={!disabled && !loading ? onPress : undefined}
      disabled={disabled || loading}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || (typeof title === 'string' ? title : undefined)}
      accessibilityState={accessibilityState || { disabled: disabled || loading, busy: loading }}
      accessibilityHint={accessibilityHint}
      {...rest}
    >
      <Animated.View
        style={[
          styles.button,
          getContainerStyle(),
          getSizeStyle(),
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
          { transform: [{ scale: scaleAnim }] },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? colors.textInverse : colors.sageBright}
          />
        ) : (
          <View style={styles.contentRow}>
            {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
            {title ? (
              <Text style={[styles.text, getTextStyle(), getTextSizeStyle(), textStyle]}>
                {title}
              </Text>
            ) : null}
            {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
          </View>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  // Variants
  primary: {
    backgroundColor: colors.sageBright,
  },
  secondary: {
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.sagePrimary,
  },
  danger: {
    backgroundColor: 'rgba(231, 111, 81, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(231, 111, 81, 0.3)',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  // Sizes
  sizeSm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
  },
  sizeMd: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.md,
  },
  sizeLg: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: radius.lg,
  },
  // Text
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: colors.textInverse,
  },
  secondaryText: {
    color: colors.textPrimary,
  },
  outlineText: {
    color: colors.sageBright,
  },
  dangerText: {
    color: colors.error,
  },
  ghostText: {
    color: colors.textSecondary,
  },
  textSm: {
    fontSize: 13,
  },
  textMd: {
    fontSize: 15,
  },
  textLg: {
    fontSize: 17,
  },
  // Icons
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.45,
  },
});

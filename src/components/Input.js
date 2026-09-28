// src/components/Input.js
// Sleek dark theme text and numeric input field

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography } from '../theme/colors';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  unit,
  error,
  secureTextEntry,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  iconLeft,
  iconRight,
  rightAccessory,
  clearable = false,
  editable = true,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  autoComplete,
  textContentType,
  selectTextOnFocus = false,
  style,
  inputStyle,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
          !editable && styles.inputDisabled,
          multiline && styles.multilineWrapper,
          style,
        ]}
      >
        {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}

        <TextInput
          style={[
            styles.input,
            multiline && styles.multilineInput,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          secureTextEntry={secureTextEntry}
          editable={editable}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          textContentType={textContentType}
          selectTextOnFocus={selectTextOnFocus}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />

        {unit ? <Text style={styles.unitText}>{unit}</Text> : null}

        {clearable && value ? (
          <TouchableOpacity
            onPress={() => onChangeText?.('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : null}

        {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
        {rightAccessory ? <View style={styles.rightAccessory}>{rightAccessory}</View> : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'none',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: colors.sagePrimary,
    backgroundColor: '#242426',
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingVertical: 10,
  },
  multilineWrapper: {
    alignItems: 'flex-start',
    minHeight: 90,
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  unitText: {
    ...typography.callout,
    color: colors.textTertiary,
    marginLeft: 6,
  },
  iconLeft: {
    marginRight: 10,
  },
  iconRight: {
    marginLeft: 8,
  },
  rightAccessory: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearBtn: {
    marginLeft: 8,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
  },
});

// src/components/ErrorBoundary.js
// Production Error Boundary with graceful fallback UI and recovery button

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography } from '../theme/colors';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="alert-circle" size={40} color={colors.error} />
            </View>

            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              An unexpected error occurred. You can safely return to the app.
            </Text>

            {this.state.error ? (
              <ScrollView style={styles.errorBox} showsVerticalScrollIndicator={false}>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
              </ScrollView>
            ) : null}

            <TouchableOpacity accessibilityRole="button"
              style={styles.retryBtn}
              onPress={this.handleRestart}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={18} color={colors.textInverse} />
              <Text style={styles.retryBtnText}>Reload Screen</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(231, 111, 81, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...typography.title2,
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  errorBox: {
    maxHeight: 120,
    width: '100%',
    backgroundColor: colors.cardElevated,
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  errorText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sageBright,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    width: '100%',
  },
  retryBtnText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
});

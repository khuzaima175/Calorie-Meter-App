// src/screens/AssistantScreen.js
// AI Nutritionist & Meal Planning Assistant powered by Gemini 2.5 Flash

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAIStore } from '../stores/useAIStore';
import { useNutritionStore } from '../stores/useNutritionStore';
import { useProfileStore } from '../stores/useProfileStore';
import AIChatBubble from '../components/AIChatBubble';
import MealPlanCard from '../components/MealPlanCard';
import { colors, radius, typography } from '../theme/colors';

export default function AssistantScreen() {
  const messages = useAIStore((s) => s.messages);
  const isGenerating = useAIStore((s) => s.isGenerating);
  const isGeneratingPlan = useAIStore((s) => s.isGeneratingPlan);
  const isReviewing = useAIStore((s) => s.isReviewing);
  const mealPlan = useAIStore((s) => s.mealPlan);
  const sendUserMessage = useAIStore((s) => s.sendUserMessage);
  const clearChat = useAIStore((s) => s.clearChat);
  const requestDailyReview = useAIStore((s) => s.requestDailyReview);
  const requestMealPlan = useAIStore((s) => s.requestMealPlan);

  const dailyTotals = useNutritionStore((s) => s.dailyTotals);
  const addMeal = useNutritionStore((s) => s.addMeal);
  const profile = useProfileStore((s) => s.profile);
  const goals = useProfileStore((s) => s.goals);

  const [inputMessage, setInputMessage] = useState('');
  const scrollViewRef = useRef(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isGenerating, isGeneratingPlan, isReviewing]);

  const userContext = {
    profile,
    goals,
    totals: dailyTotals,
    remaining: {
      calories: goals.calories - dailyTotals.calories,
      protein: goals.protein - dailyTotals.protein,
      carbs: goals.carbs - dailyTotals.carbs,
      fat: goals.fat - dailyTotals.fat,
    },
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || isGenerating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const msg = inputMessage.trim();
    setInputMessage('');
    await sendUserMessage(msg, userContext, scrollToBottom);
  };

  const handleQuickPrompt = async (promptText) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await sendUserMessage(promptText, userContext, scrollToBottom);
  };

  const handleGenerateReview = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await sendUserMessage('Please review my logged nutrition for today and give me feedback.', userContext, scrollToBottom);
  };

  const handleGenerateMealPlan = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await requestMealPlan(profile, goals, 'high protein, whole foods');
  };

  const handleLogMealItemFromPlan = async (mealItem) => {
    await addMeal({
      name: mealItem.title,
      meal_type: mealItem.meal_type || 'lunch',
      calories: mealItem.calories,
      protein: mealItem.protein,
      carbs: mealItem.carbs,
      fat: mealItem.fat,
      portion: '1 serving',
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarBox}>
              <Ionicons name="leaf" size={18} color={colors.sageBright} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Sage AI Nutritionist</Text>
              <Text style={styles.headerStatus}>Gemini 3.7 Flash • Active Coach</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.clearBtn}
            onPress={clearChat}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Quick Suggestion Pills */}
        <View style={styles.quickBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickScrollContent}
          >
            <TouchableOpacity
              style={styles.actionChip}
              onPress={() => handleQuickPrompt(`What should I eat with my remaining ${goals.calories - dailyTotals.calories} kcal?`)}
              activeOpacity={0.7}
            >
              <Ionicons name="restaurant-outline" size={13} color={colors.sageBright} />
              <Text style={styles.actionChipText}>What to eat next</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionChip}
              onPress={handleGenerateReview}
              activeOpacity={0.7}
            >
              <Ionicons name="analytics-outline" size={13} color={colors.carbs} />
              <Text style={styles.actionChipText}>Review Today's Log</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionChip}
              onPress={handleGenerateMealPlan}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={13} color={colors.protein} />
              <Text style={styles.actionChipText}>Generate Meal Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionChip}
              onPress={() => handleQuickPrompt('Give me 3 high-protein snack ideas under 200 calories.')}
              activeOpacity={0.7}
            >
              <Ionicons name="flash-outline" size={13} color={colors.caloriesBurned} />
              <Text style={styles.actionChipText}>High-Protein Snacks</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Messages Feed */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <AIChatBubble
              key={msg.id}
              message={msg}
              onQuickReplyPress={handleQuickPrompt}
            />
          ))}

          {/* Generated Meal Plan Card if present */}
          {mealPlan && (
            <MealPlanCard
              plan={mealPlan}
              onLogMealItem={handleLogMealItemFromPlan}
            />
          )}

          {/* Thinking Indicator */}
          {(isGenerating || isGeneratingPlan || isReviewing) && (
            <View style={styles.thinkingBox}>
              <View style={styles.avatarBoxSmall}>
                <Ionicons name="leaf" size={12} color={colors.sageBright} />
              </View>
              <View style={styles.thinkingBubble}>
                <ActivityIndicator size="small" color={colors.sageBright} />
                <Text style={styles.thinkingText}>
                  {isGeneratingPlan
                    ? 'Crafting your personalized meal plan...'
                    : isReviewing
                    ? 'Analyzing your daily nutrition...'
                    : 'Sage is thinking...'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Chat Input Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ask Sage anything about nutrition or recipes..."
              placeholderTextColor={colors.textTertiary}
              value={inputMessage}
              onChangeText={setInputMessage}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                inputMessage.trim() ? styles.sendBtnActive : null,
              ]}
              onPress={handleSend}
              disabled={!inputMessage.trim() || isGenerating}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={inputMessage.trim() ? colors.textInverse : colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.sageSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.3)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerStatus: {
    ...typography.caption,
    color: colors.sageBright,
    fontSize: 11,
  },
  clearBtn: {
    padding: 6,
  },
  quickBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    paddingVertical: 8,
  },
  quickScrollContent: {
    paddingHorizontal: 12,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardElevated,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 5,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 12,
    paddingBottom: 20,
  },
  thinkingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  avatarBoxSmall: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.sageSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  thinkingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    marginBottom: Platform.OS === 'ios' ? 0 : 70,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    minHeight: 46,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14.5,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnActive: {
    backgroundColor: colors.sageBright,
  },
});

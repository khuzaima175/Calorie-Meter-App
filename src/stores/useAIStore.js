// src/stores/useAIStore.js
// Zustand store for AI Assistant chat, daily reviews, and personalized meal planning

import { create } from 'zustand';
import {
  sendNutritionistChatMessage,
  generateDailyReview,
  generatePersonalizedMealPlan,
} from '../services/geminiService';

const INITIAL_GREETING = {
  id: 'greeting-1',
  role: 'assistant',
  text: "Hello! I'm **Sage**, your personal nutritionist and wellness coach. 🌿\n\nHow can I help you today? You can ask me what to eat for dinner to hit your protein goal, get recipe ideas, or request a customized meal plan.",
  timestamp: new Date().toISOString(),
  quickReplies: [
    'What should I eat for dinner?',
    'How do I hit my protein goal today?',
    'Give me a high-protein breakfast idea',
    'Review today\'s nutrition',
  ],
};

export const useAIStore = create((set, get) => ({
  messages: [INITIAL_GREETING],
  isGenerating: false,
  isAnalyzing: false,
  dailyReview: null,
  isReviewing: false,
  mealPlan: null,
  isGeneratingPlan: false,
  error: null,

  sendUserMessage: async (text, userContext) => {
    if (!text.trim()) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [...get().messages, userMsg];
    set({ messages: updatedHistory, isGenerating: true, error: null });

    try {
      const replyText = await sendNutritionistChatMessage(
        updatedHistory.map((m) => ({ role: m.role, text: m.text })),
        text.trim(),
        userContext
      );

      const aiMsg = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toISOString(),
      };

      set({
        messages: [...updatedHistory, aiMsg],
        isGenerating: false,
      });
    } catch (err) {
      console.error('Chat AI error:', err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: `⚠️ *${err.message || 'Unable to connect to AI nutritionist. Please check your connection and API key.'}*`,
        timestamp: new Date().toISOString(),
      };
      set({
        messages: [...updatedHistory, errorMsg],
        isGenerating: false,
        error: err.message,
      });
    }
  },

  clearChat: () => {
    set({
      messages: [
        {
          ...INITIAL_GREETING,
          id: `greeting-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      ],
      error: null,
    });
  },

  requestDailyReview: async (dailySummary, goals) => {
    set({ isReviewing: true, error: null });
    try {
      const reviewText = await generateDailyReview(dailySummary, goals);
      set({ dailyReview: reviewText, isReviewing: false });
      return reviewText;
    } catch (err) {
      console.error('Daily review error:', err);
      set({ isReviewing: false, error: err.message });
      throw err;
    }
  },

  requestMealPlan: async (profile, goals, preferences) => {
    set({ isGeneratingPlan: true, error: null });
    try {
      const plan = await generatePersonalizedMealPlan(profile, goals, preferences);
      set({ mealPlan: plan, isGeneratingPlan: false });
      return plan;
    } catch (err) {
      console.error('Meal plan generation error:', err);
      set({ isGeneratingPlan: false, error: err.message });
      throw err;
    }
  },
}));

// src/stores/useAIStore.js
// Zustand store for AI Assistant chat with real-time streaming tokens, daily reviews, and personalized meal planning

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

let conversationVersion = 0;

export const useAIStore = create((set, get) => ({
  messages: [INITIAL_GREETING],
  isGenerating: false,
  isAnalyzing: false,
  dailyReview: null,
  isReviewing: false,
  mealPlan: null,
  isGeneratingPlan: false,
  error: null,

  sendUserMessage: async (text, userContext, onStreamUpdate) => {
    if (get().isGenerating || typeof text !== 'string' || !text.trim()) return;
    const version = conversationVersion;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const aiMsgId = `ai-${Date.now() + 1}`;
    const aiPlaceholder = {
      id: aiMsgId,
      role: 'assistant',
      text: '',
      isStreaming: true,
      timestamp: new Date().toISOString(),
    };

    const currentHistory = get().messages;
    const boundedHistory = currentHistory.slice(-40);
    const updatedHistory = [...boundedHistory, userMsg, aiPlaceholder];
    set({ messages: updatedHistory, isGenerating: true, error: null });

    try {
      // Pass only the last 16 messages as context to guarantee staying within fast token budgets
      const contextHistory = currentHistory.slice(-16).map((m) => ({ role: m.role, text: m.text }));
      const replyText = await sendNutritionistChatMessage(
        contextHistory,
        text.trim(),
        userContext
      );
      if (version !== conversationVersion) return;

      // Instant rendering: Gemini 3.5 Flash-Lite returns in ~1s, display immediately
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === aiMsgId ? { ...m, text: replyText, isStreaming: false } : m
        ),
        isGenerating: false,
      }));

      if (onStreamUpdate) {
        onStreamUpdate();
      }
    } catch (err) {
      if (version !== conversationVersion) return;
      console.error('Chat AI error:', err);
      const errorMsg = `⚠️ *${err.message || 'Unable to connect to AI nutritionist. Please check your connection and API key.'}*`;
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === aiMsgId ? { ...m, text: errorMsg, isStreaming: false } : m
        ),
        isGenerating: false,
        error: err.message,
      }));
    }
  },

  clearChat: () => {
    conversationVersion++;
    set({
      isGenerating: false,
      isGeneratingPlan: false,
      isReviewing: false,
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
    if (get().isReviewing) return;
    const version = conversationVersion;
    set({ isReviewing: true, error: null });
    try {
      const reviewText = await generateDailyReview(dailySummary, goals);
      if (version !== conversationVersion) return null;
      set({ dailyReview: reviewText, isReviewing: false });
      return reviewText;
    } catch (err) {
      if (version !== conversationVersion) return null;
      console.error('Daily review error:', err);
      set({ isReviewing: false, error: err.message });
      throw err;
    }
  },

  requestMealPlan: async (profile, goals, preferences) => {
    if (get().isGeneratingPlan) return;
    const version = conversationVersion;
    set({ isGeneratingPlan: true, error: null });
    try {
      const plan = await generatePersonalizedMealPlan(profile, goals, preferences);
      if (version !== conversationVersion) return null;
      set({ mealPlan: plan, isGeneratingPlan: false });
      return plan;
    } catch (err) {
      if (version !== conversationVersion) return null;
      console.error('Meal plan generation error:', err);
      set({ isGeneratingPlan: false, error: err.message });
      throw err;
    }
  },
}));

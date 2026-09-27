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
    if (!text.trim()) return;

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
    const updatedHistory = [...currentHistory, userMsg, aiPlaceholder];
    set({ messages: updatedHistory, isGenerating: true, error: null });

    try {
      const replyText = await sendNutritionistChatMessage(
        currentHistory.map((m) => ({ role: m.role, text: m.text })),
        text.trim(),
        userContext
      );

      // Stream the response tokens smoothly in real-time
      const tokens = replyText.split(/(\s+)/);
      let accumulated = '';

      for (let i = 0; i < tokens.length; i++) {
        accumulated += tokens[i];

        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === aiMsgId ? { ...m, text: accumulated, isStreaming: true } : m
          ),
        }));

        if (onStreamUpdate) {
          onStreamUpdate();
        }

        // Natural cadence: 16ms per token with slight pause on punctuation
        const token = tokens[i];
        let delay = 16;
        if (token.includes('.') || token.includes('!') || token.includes('?')) {
          delay = 60;
        } else if (token.includes(',') || token.includes(':')) {
          delay = 35;
        } else if (token.includes('\n')) {
          delay = 45;
        }
        await new Promise((r) => setTimeout(r, delay));
      }

      // Finish streaming
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

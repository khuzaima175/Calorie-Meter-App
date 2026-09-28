// src/services/notificationService.js
// Local notification manager for daily meal, hydration, and evening review reminders

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification presentation behavior
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Requests notification permissions from user
 */
export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.warn('Failed to get notification permissions:', err);
    return false;
  }
}

/**
 * Schedules daily recurring meal and hydration reminders
 */
export async function scheduleDailyReminders() {
  if (Platform.OS === 'web') return false;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return false;

    // Clear existing notifications before rescheduling
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 1. Breakfast Reminder (8:30 AM)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '☀️ Good morning!',
        body: 'Start your day right — log your breakfast to keep your streak alive.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 30,
      },
    });

    // 2. Lunch Reminder (1:15 PM)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🥗 Lunch Time!',
        body: 'Snap a photo of your lunch or describe what you ate with Sage AI.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 13,
        minute: 15,
      },
    });

    // 3. Afternoon Hydration Reminder (4:30 PM)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💧 Stay Hydrated',
        body: 'Time for a glass of water! Keep your daily hydration goal on track.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 16,
        minute: 30,
      },
    });

    // 4. Dinner & Daily Review Reminder (7:45 PM)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌙 Dinner & Daily Review',
        body: "Check your remaining calories and get today's nutrition review from Sage.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 19,
        minute: 45,
      },
    });

    return true;
  } catch (err) {
    console.warn('Failed to schedule daily reminders:', err);
    return false;
  }
}

/**
 * Cancels all scheduled local reminders
 */
export async function cancelAllReminders() {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.warn('Failed to cancel reminders:', err);
  }
}

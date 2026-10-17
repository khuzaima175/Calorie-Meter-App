// src/services/notificationService.js
// Local notification manager for daily meal, hydration, and evening review reminders

import { Platform } from 'react-native';
const Notifications = Platform.OS === 'web' ? null : require('expo-notifications');

const CHANNEL_ID = 'reminders';
let remindersExplicitlyCancelled = false;

// Configure notification presentation behavior
if (Platform.OS !== 'web' && Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Android requires an explicit high-importance channel for heads-up reminders.
 * Must exist before permissions are requested (Android 13+) and before scheduling.
 */
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || !Notifications?.setNotificationChannelAsync) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Meal and hydration reminders',
    importance: Notifications.AndroidImportance?.HIGH ?? 4,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6B9B7D',
    sound: 'default',
  });
}

/**
 * Checks whether daily reminders are currently scheduled
 */
export async function areRemindersScheduled() {
  if (Platform.OS === 'web') {
    try {
      return typeof window !== 'undefined' && window.localStorage?.getItem('caloriesnap_reminders_enabled') === 'true';
    } catch {
      return false;
    }
  }
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return Array.isArray(scheduled) && scheduled.length > 0;
  } catch {
    return false;
  }
}

/**
 * Requests notification permissions from user
 */
export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (window.Notification.permission === 'granted') return true;
        const perm = await window.Notification.requestPermission();
        return perm === 'granted';
      }
    } catch {}
    return true;
  }

  try {
    await ensureAndroidChannel();
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

function dailyTrigger(hour, minute) {
  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
  };
}

/**
 * Sends an immediate local notification banner so the user can verify notifications work right away
 */
export async function sendTestNotification(
  title = '🌿 CalorieSnap Reminders Active',
  body = 'Push notifications are working! Breakfast, lunch, hydration, and dinner reminders are set.'
) {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (window.Notification.permission !== 'granted') {
          await window.Notification.requestPermission();
        }
        if (window.Notification.permission === 'granted') {
          new window.Notification(title, { body });
          return true;
        }
      }
    } catch {}
    return false;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: null,
    });
    return true;
  } catch (err) {
    console.warn('Failed to send instant notification:', err);
    return false;
  }
}

/**
 * Schedules daily recurring meal and hydration reminders
 */
export async function scheduleDailyReminders(options = {}) {
  const { sendConfirmation = false } = options;

  if (Platform.OS === 'web') {
    try {
      await requestNotificationPermissions();
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('caloriesnap_reminders_enabled', 'true');
      }
      if (sendConfirmation) {
        await sendTestNotification();
      }
      return true;
    } catch {
      return false;
    }
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return false;

    remindersExplicitlyCancelled = false;

    // Clear existing notifications before rescheduling
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 1. Breakfast Reminder (8:30 AM)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '☀️ Good morning!',
        body: 'Start your day right — log your breakfast to keep your streak alive.',
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: dailyTrigger(8, 30),
    });

    // 2. Lunch Reminder (1:15 PM)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🥗 Lunch Time!',
        body: 'Snap a photo of your lunch or describe what you ate with Sage AI.',
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: dailyTrigger(13, 15),
    });

    // 3. Afternoon Hydration Reminder (4:30 PM)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💧 Stay Hydrated',
        body: 'Time for a glass of water! Keep your daily hydration goal on track.',
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: dailyTrigger(16, 30),
    });

    // 4. Dinner & Daily Review Reminder (7:45 PM)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌙 Dinner & Daily Review',
        body: "Check your remaining calories and get today's nutrition review from Sage.",
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: dailyTrigger(19, 45),
    });

    if (sendConfirmation) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Daily Reminders Enabled',
          body: 'You will receive reminders at 8:30 AM, 1:15 PM, 4:30 PM, and 7:45 PM.',
          sound: true,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: null,
      }).catch(() => {});
    }

    return true;
  } catch (err) {
    console.warn('Failed to schedule daily reminders:', err);
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    return false;
  }
}

/**
 * One-time opt-in on first launch: if the OS has never been asked for notification
 * permission (or permission is already granted in Expo Go with 0 scheduled reminders),
 * schedule the default reminders. Never throws.
 */
export async function ensureRemindersOnFirstLaunch() {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'undetermined') {
      return await scheduleDailyReminders();
    }
    if (status === 'granted' && !remindersExplicitlyCancelled) {
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      if (!existing || existing.length === 0) {
        return await scheduleDailyReminders();
      }
    }
    return false;
  } catch (err) {
    console.warn('First-launch reminder setup skipped:', err);
    return false;
  }
}

/**
 * Cancels all scheduled local reminders
 */
export async function cancelAllReminders() {
  remindersExplicitlyCancelled = true;
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('caloriesnap_reminders_enabled', 'false');
      }
    } catch {}
    return;
  }
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.warn('Failed to cancel reminders:', err);
    throw err;
  }
}

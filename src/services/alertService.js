import { Alert as NativeAlert, Platform } from 'react-native';

// React Native's Alert has no web implementation. Keep confirmation callbacks
// and async failure reporting consistent across platforms.
export const Alert = {
  alert(title, message = '', buttons, options) {
    const safeButtons = buttons?.map((button) => ({ ...button, onPress: button.onPress ? () => {
      Promise.resolve().then(button.onPress).catch((error) => Alert.alert('Action Failed', error?.message || 'Please try again.'));
    } : undefined }));
    if (Platform.OS !== 'web') return NativeAlert.alert(title, message, safeButtons, options);
    const text = `${title}\n\n${message}`;
    if (!safeButtons?.length || safeButtons.length === 1) {
      window.alert(text);
      safeButtons?.[0]?.onPress?.();
      return;
    }
    const action = safeButtons.find((button) => button.style !== 'cancel');
    const cancel = safeButtons.find((button) => button.style === 'cancel');
    (window.confirm(text) ? action : cancel)?.onPress?.();
  },
};

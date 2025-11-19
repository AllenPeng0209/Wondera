import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Global handler so notifications show alerts by default
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function sendLocalKnockNotification({ conversationId, title, body }) {
  if (Platform.OS === 'web') {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {
        type: 'ai-knock',
        conversationId,
      },
    },
    // null trigger = show immediately
    trigger: null,
  });
}


import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const COMPLETION_CHANNEL_ID = "pomodoro-complete";

export function configureNotificationHandler(): void {
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

export async function prepareNotificationsAsync(): Promise<void> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(COMPLETION_CHANNEL_ID, {
        name: "Pomodoro",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });
    }

    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== "granted") {
      await Notifications.requestPermissionsAsync();
    }
  } catch {
    // Notification support is optional for MVP runtime resilience.
  }
}

export async function sendCompletionNotificationAsync(): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Session complete",
        body: "Nice work. Take a short pause.",
        sound: "default",
      },
      trigger: null,
    });
  } catch {
    // If notification permissions are denied we still complete session + history.
  }
}

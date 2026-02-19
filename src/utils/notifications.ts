import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const COMPLETION_CHANNEL_ID = "pomodoro-complete";
const WEB_NOTIFICATION_TAG = "pomodoro-complete";

type WebNotificationPermission = "default" | "granted" | "denied";

function getWebNotificationApi():
  | {
      permission?: WebNotificationPermission;
      requestPermission: () => Promise<WebNotificationPermission>;
      new (title: string, options?: Record<string, unknown>): unknown;
    }
  | null {
  if (Platform.OS !== "web") {
    return null;
  }

  const notificationApi = (globalThis as { Notification?: unknown }).Notification;

  if (typeof notificationApi !== "function") {
    return null;
  }

  return notificationApi as {
    permission?: WebNotificationPermission;
    requestPermission: () => Promise<WebNotificationPermission>;
    new (title: string, options?: Record<string, unknown>): unknown;
  };
}

async function requestWebNotificationPermissionAsync(): Promise<WebNotificationPermission | null> {
  const notificationApi = getWebNotificationApi();

  if (!notificationApi) {
    return null;
  }

  try {
    const current = notificationApi.permission ?? "default";
    if (current === "granted" || current === "denied") {
      return current;
    }

    return await notificationApi.requestPermission();
  } catch {
    return null;
  }
}

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
    if (Platform.OS === "web") {
      await requestWebNotificationPermissionAsync();
      return;
    }

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

export async function ensureBrowserAlarmPermissionAsync(): Promise<void> {
  if (Platform.OS !== "web") {
    return;
  }

  try {
    await requestWebNotificationPermissionAsync();
  } catch {
    // Browser notification permissions are best-effort.
  }
}

export async function sendCompletionNotificationAsync(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      const notificationApi = getWebNotificationApi();

      if (notificationApi?.permission === "granted") {
        new notificationApi("Session complete", {
          body: "Nice work. Take a short pause.",
          tag: WEB_NOTIFICATION_TAG,
        });
      }
      return;
    }

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

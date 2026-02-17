import { Platform } from "react-native";

type AnalyticsParams = Record<string, string | number>;

type AnalyticsClient = {
  logEvent: (name: string, params?: AnalyticsParams) => Promise<void>;
};

let cachedClient: AnalyticsClient | null | undefined;

async function getAnalyticsClient(): Promise<AnalyticsClient | null> {
  if (Platform.OS === "web") {
    return null;
  }

  if (cachedClient !== undefined) {
    return cachedClient;
  }

  try {
    const analyticsModule = (await import("@react-native-firebase/analytics")).default;
    cachedClient = analyticsModule();
    return cachedClient;
  } catch {
    cachedClient = null;
    return null;
  }
}

export async function logAnalyticsEvent(
  name: string,
  params?: AnalyticsParams,
): Promise<void> {
  const client = await getAnalyticsClient();
  if (!client) {
    return;
  }

  try {
    await client.logEvent(name, params);
  } catch {
    // Analytics should never block app behavior.
  }
}

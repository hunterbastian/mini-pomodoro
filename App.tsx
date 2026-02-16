import { Manrope_400Regular, Manrope_600SemiBold } from "@expo-google-fonts/manrope";
import { Newsreader_500Medium } from "@expo-google-fonts/newsreader";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { TabsNavigator } from "./src/navigation/Tabs";
import { theme } from "./src/theme/tokens";
import {
  configureNotificationHandler,
  prepareNotificationsAsync,
} from "./src/utils/notifications";

configureNotificationHandler();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_500Medium,
    Manrope_400Regular,
    Manrope_600SemiBold,
  });

  useEffect(() => {
    void prepareNotificationsAsync();
  }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingRoot}>
          <ActivityIndicator color={theme.colors.accent} size="small" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.appRoot}>
        <TabsNavigator />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  loadingRoot: {
    alignItems: "center",
    backgroundColor: theme.colors.background,
    flex: 1,
    justifyContent: "center",
  },
});

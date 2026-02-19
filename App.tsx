import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { TabsNavigator } from "./src/navigation/Tabs";
import { theme } from "./src/theme/tokens";
import {
  configureNotificationHandler,
  prepareNotificationsAsync,
} from "./src/utils/notifications";

configureNotificationHandler();

export default function App() {
  useEffect(() => {
    void prepareNotificationsAsync();
  }, []);

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
});

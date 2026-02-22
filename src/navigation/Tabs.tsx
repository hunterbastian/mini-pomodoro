import {
  DefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useWindowDimensions } from "react-native";

import { HistoryScreen } from "../screens/HistoryScreen";
import { TimerScreen } from "../screens/TimerScreen";
import { theme } from "../theme/tokens";

type RootTabParamList = {
  Timer: undefined;
  History: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const navTheme: NavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    border: theme.colors.border,
    card: theme.colors.surface,
    primary: theme.colors.accent,
    text: theme.colors.textPrimary,
  },
};

export function TabsNavigator() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const tabBarWidth = Math.min(520, Math.max(280, width - 24));

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            backgroundColor: theme.colors.background,
            paddingBottom: isDesktop ? 0 : 84,
          },
          tabBarActiveTintColor: theme.colors.accentSecondary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: isDesktop ? { display: "none" } : {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            height: 64,
            marginBottom: 14,
            alignSelf: "center",
            borderRadius: theme.radius.md,
            width: tabBarWidth,
            paddingBottom: 8,
            paddingTop: 6,
            position: "absolute",
            shadowColor: "rgba(200, 147, 90, 0.08)",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.6,
            shadowRadius: 12,
          },
          tabBarIcon: () => null,
          tabBarIconStyle: { display: "none" },
          tabBarLabelStyle: {
            fontFamily: theme.typography.mono,
            fontSize: 10,
            letterSpacing: 1.1,
            textTransform: "uppercase",
          },
        }}
      >
        <Tab.Screen name="Timer" component={TimerScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

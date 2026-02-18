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
            paddingBottom: 92,
          },
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            height: 68,
            marginBottom: isDesktop ? 20 : 12,
            alignSelf: "center",
            borderRadius: theme.radius.md,
            width: tabBarWidth,
            paddingBottom: 10,
            paddingTop: 8,
            position: "absolute",
            shadowColor: "#2D241A",
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.12,
            shadowRadius: 14,
          },
          tabBarIcon: () => null,
          tabBarIconStyle: { display: "none" },
          tabBarLabelStyle: {
            fontFamily: theme.typography.mono,
            fontSize: 11,
            letterSpacing: 0.8,
          },
        }}
      >
        <Tab.Screen name="Timer" component={TimerScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

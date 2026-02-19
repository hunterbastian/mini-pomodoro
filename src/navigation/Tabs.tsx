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
            paddingBottom: 84,
          },
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            height: 60,
            marginBottom: isDesktop ? 20 : 12,
            alignSelf: "center",
            borderRadius: theme.radius.md,
            width: tabBarWidth,
            paddingBottom: 8,
            paddingTop: 6,
            position: "absolute",
            shadowColor: theme.colors.glowA,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
          },
          tabBarIcon: () => null,
          tabBarIconStyle: { display: "none" },
          tabBarLabelStyle: {
            fontFamily: theme.typography.mono,
            fontSize: 11,
            letterSpacing: 2,
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

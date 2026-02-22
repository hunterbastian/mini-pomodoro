import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Polygon } from "react-native-svg";

import { theme } from "../theme/tokens";

type StarburstActionButtonProps = {
  label: string;
  isRunning: boolean;
  onPress: () => void;
  size?: number;
};

const STARBURST_POINTS =
  "110,0 134,22 165,11 176,40 209,44 203,77 220,110 203,143 209,176 176,180 165,209 134,198 110,220 86,198 55,209 44,180 11,176 17,143 0,110 17,77 11,44 44,40 55,11 86,22";

export function StarburstActionButton({
  label,
  isRunning,
  onPress,
  size = 220,
}: StarburstActionButtonProps) {
  return (
    <Pressable
      accessibilityLabel="Primary timer action"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        {
          height: size,
          transform: [{ scale: pressed ? 0.95 : 1 }],
          width: size,
        },
      ]}
    >
      <Svg height={size} style={StyleSheet.absoluteFillObject} viewBox="0 0 220 220" width={size}>
        <Polygon
          fill={theme.colors.accentGlow}
          points={STARBURST_POINTS}
          stroke={theme.colors.accentSecondary}
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </Svg>

      <View style={styles.content}>
        <Svg height={48} viewBox="0 0 24 24" width={48}>
          {isRunning ? (
            <Path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="#0a0c0f" />
          ) : (
            <Path d="M8 5v14l11-7z" fill="#0a0c0f" />
          )}
        </Svg>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#0a0c0f",
    fontFamily: theme.typography.heading,
    fontSize: 24,
    letterSpacing: 1,
    marginTop: 2,
    textTransform: "capitalize",
  },
  pressable: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
});

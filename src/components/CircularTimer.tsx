import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { theme } from "../theme/tokens";
import { formatSeconds } from "../utils/time";

type CircularTimerProps = {
  remainingSec: number;
  totalSec: number;
  size?: number;
  strokeWidth?: number;
};

export function CircularTimer({
  remainingSec,
  totalSec,
  size = 280,
  strokeWidth = 10,
}: CircularTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSec <= 0 ? 0 : Math.max(0, Math.min(1, remainingSec / totalSec));
  const dashOffset = circumference * (1 - progress);

  return (
    <View style={[styles.wrapper, { height: size, width: size }]}>
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke={theme.colors.surfaceMuted}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
          stroke={theme.colors.accent}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </Svg>

      <View style={styles.labelWrap}>
        <Text style={styles.timeLabel}>{formatSeconds(remainingSec)}</Text>
        <Text style={styles.caption}>Focus</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body,
    fontSize: 14,
    letterSpacing: 0.5,
    marginTop: theme.spacing.xs,
    textTransform: "uppercase",
  },
  labelWrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  timeLabel: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading,
    fontSize: 56,
    letterSpacing: 0.5,
  },
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
});

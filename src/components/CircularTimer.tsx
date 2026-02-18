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
  size = 248,
  strokeWidth = 9,
}: CircularTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSec <= 0 ? 0 : Math.max(0, Math.min(1, remainingSec / totalSec));
  const dashOffset = circumference * (1 - progress);
  const timeFontSize = Math.max(40, Math.floor(size * 0.21));
  const captionSize = Math.max(10, Math.floor(size * 0.045));

  return (
    <View style={[styles.wrapper, { height: size, width: size }]}>
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke={theme.colors.surfaceMuted}
          strokeDasharray="2 8"
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
          strokeLinecap="square"
          strokeWidth={strokeWidth}
        />
      </Svg>

      <View style={styles.labelWrap}>
        <Text style={[styles.timeLabel, { fontSize: timeFontSize }]}>{formatSeconds(remainingSec)}</Text>
        <Text style={[styles.caption, { fontSize: captionSize }]}>Focus</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    letterSpacing: 1.4,
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
    fontFamily: theme.typography.mono,
    fontVariant: ["tabular-nums"],
    letterSpacing: 1.8,
  },
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4A3A2A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
});

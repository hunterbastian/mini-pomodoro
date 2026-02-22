/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — PixelRollingDigits
 *
 * DIGIT SWITCH (per changed digit)
 *    0ms   next digit starts at y +12, opacity 0
 *  180ms   digit slides to y 0
 *  220ms   opacity reaches 1
 *
 * Affected only by `value` character changes; separators stay static.
 * ───────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { theme } from "../theme/tokens";

const DIGIT_SWITCH = {
  durationOpacity: 220,
  durationTranslate: 180,
  easing: Easing.out(Easing.cubic),
  fromOffsetY: 12,
};

type AnimatedDigitProps = {
  char: string;
  fontSize: number;
};

function AnimatedDigit({ char, fontSize }: AnimatedDigitProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(DIGIT_SWITCH.fromOffsetY)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(DIGIT_SWITCH.fromOffsetY);

    Animated.parallel([
      Animated.timing(opacity, {
        duration: DIGIT_SWITCH.durationOpacity,
        easing: DIGIT_SWITCH.easing,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: DIGIT_SWITCH.durationTranslate,
        easing: DIGIT_SWITCH.easing,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [char, opacity, translateY]);

  return (
    <Animated.Text
      style={[
        styles.digit,
        {
          fontSize,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {char}
    </Animated.Text>
  );
}

type PixelRollingDigitsProps = {
  value: string;
  fontSize: number;
  plateStyle?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export function PixelRollingDigits({ value, fontSize, plateStyle, compact = false }: PixelRollingDigitsProps) {
  const chars = useMemo(() => value.split(""), [value]);

  return (
    <View style={[styles.plate, compact && styles.plateCompact, plateStyle]}>
      <View style={styles.row}>
        {chars.map((char, index) =>
          char === ":" ? (
            <Text key={`sep-${index}`} style={[styles.separator, { fontSize: Math.max(14, fontSize - 2) }]}>:
            </Text>
          ) : (
            <AnimatedDigit char={char} fontSize={fontSize} key={`digit-${index}`} />
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  digit: {
    color: "#e8b06a",
    fontFamily: theme.typography.mono,
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
    textShadowColor: "rgba(200, 147, 90, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  plate: {
    alignItems: "center",
    backgroundColor: "rgba(10, 12, 15, 0.8)",
    borderColor: "rgba(200, 147, 90, 0.15)",
    borderWidth: 1,
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  plateCompact: {
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  separator: {
    color: "#e8b06a",
    fontFamily: theme.typography.mono,
    fontVariant: ["tabular-nums"],
    marginHorizontal: 1,
    textShadowColor: "rgba(200, 147, 90, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

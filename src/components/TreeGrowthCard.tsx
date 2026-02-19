import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import Svg, { Rect } from "react-native-svg";

import { theme } from "../theme/tokens";

type TreeGrowthCardProps = {
  completedSessions: number;
  growthProgress: number;
  isActive: boolean;
};

type Pixel = {
  color: string;
  x: number;
  y: number;
};

const PX = 8;
const SPRITE_MIN_X = -4;
const SPRITE_MAX_Y = 8;

const WOOD = "#8f563b";
const WOOD_DARK = "#663931";
const LEAF_LIGHT = "#63c74d";
const LEAF_DARK = "#2c6e49";
const FRUIT = "#d95763";

const VIEWPORT_PATTERN_STYLE: ViewStyle = Platform.OS === "web"
  ? ({
      backgroundImage:
        "linear-gradient(rgba(0,0,0,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.12) 1px, transparent 1px)",
      backgroundSize: "16px 16px",
    } as unknown as ViewStyle)
  : {};

const STAGE_PIXELS: Record<number, Pixel[]> = {
  1: [
    { x: 0, y: 0, color: WOOD },
    { x: 0, y: 1, color: WOOD },
    { x: -1, y: 2, color: LEAF_LIGHT },
    { x: 0, y: 2, color: LEAF_DARK },
    { x: 1, y: 2, color: LEAF_LIGHT },
  ],
  2: [
    { x: 0, y: 0, color: WOOD },
    { x: 0, y: 1, color: WOOD },
    { x: 0, y: 2, color: WOOD },

    { x: -1, y: 3, color: LEAF_DARK },
    { x: 0, y: 3, color: LEAF_LIGHT },
    { x: 1, y: 3, color: LEAF_DARK },

    { x: -2, y: 4, color: LEAF_DARK },
    { x: -1, y: 4, color: LEAF_LIGHT },
    { x: 0, y: 4, color: LEAF_LIGHT },
    { x: 1, y: 4, color: LEAF_LIGHT },
    { x: 2, y: 4, color: LEAF_DARK },

    { x: 0, y: 5, color: LEAF_LIGHT },
  ],
  3: [
    { x: 0, y: 0, color: WOOD },
    { x: 1, y: 0, color: WOOD_DARK },
    { x: 0, y: 1, color: WOOD },
    { x: 0, y: 2, color: WOOD },

    { x: -2, y: 3, color: LEAF_DARK },
    { x: -1, y: 3, color: LEAF_DARK },
    { x: 0, y: 3, color: LEAF_LIGHT },
    { x: 1, y: 3, color: LEAF_DARK },
    { x: 2, y: 3, color: LEAF_DARK },

    { x: -3, y: 4, color: LEAF_DARK },
    { x: -2, y: 4, color: LEAF_LIGHT },
    { x: -1, y: 4, color: LEAF_LIGHT },
    { x: 0, y: 4, color: LEAF_LIGHT },
    { x: 1, y: 4, color: LEAF_LIGHT },
    { x: 2, y: 4, color: LEAF_LIGHT },
    { x: 3, y: 4, color: LEAF_DARK },

    { x: -2, y: 5, color: LEAF_LIGHT },
    { x: -1, y: 5, color: LEAF_LIGHT },
    { x: 0, y: 5, color: LEAF_LIGHT },
    { x: 1, y: 5, color: LEAF_LIGHT },
    { x: 2, y: 5, color: LEAF_LIGHT },

    { x: -1, y: 6, color: LEAF_LIGHT },
    { x: 0, y: 6, color: LEAF_LIGHT },
    { x: 1, y: 6, color: LEAF_LIGHT },
    { x: 0, y: 7, color: LEAF_LIGHT },

    { x: -1, y: 4, color: FRUIT },
    { x: 1, y: 5, color: FRUIT },
  ],
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getStage(growthProgress: number): number {
  if (growthProgress >= 0.72) return 3;
  if (growthProgress >= 0.32) return 2;
  return 1;
}

function getStatus(stage: number, isActive: boolean): string {
  if (isActive && stage < 3) return "Status: Growing";
  if (stage === 1) return "Status: Seedling";
  if (stage === 2) return "Status: Sprouting";
  return "Status: Bearing Fruit";
}

export function TreeGrowthCard({
  completedSessions,
  growthProgress,
  isActive,
}: TreeGrowthCardProps) {
  const normalizedProgress = clamp01(growthProgress);
  const stage = useMemo(() => getStage(normalizedProgress), [normalizedProgress]);
  const waterValue = Math.round(normalizedProgress * 50);
  const sunValue = Math.min(3, Math.max(0, Math.round(normalizedProgress * 3)));
  const sprite = STAGE_PIXELS[stage];

  const pulse = useRef(new Animated.Value(1)).current;
  const stageRef = useRef(stage);

  useEffect(() => {
    if (!isActive) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 450,
          easing: Easing.inOut(Easing.quad),
          toValue: 1.06,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 450,
          easing: Easing.inOut(Easing.quad),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [isActive, pulse]);

  useEffect(() => {
    if (stage === stageRef.current) {
      return;
    }

    stageRef.current = stage;
    pulse.stopAnimation();
    pulse.setValue(1);

    Animated.sequence([
      Animated.timing(pulse, {
        duration: 140,
        easing: Easing.out(Easing.quad),
        toValue: 1.2,
        useNativeDriver: true,
      }),
      Animated.spring(pulse, {
        bounciness: 12,
        speed: 16,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pulse, stage]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.entityName}>Ancient Oak</Text>
          <Text style={styles.entityStatus}>{getStatus(stage, isActive)}</Text>
        </View>
        <View style={styles.headerMenu}>
          <Text style={styles.headerMenuIcon}>☰</Text>
        </View>
      </View>

      <View style={[styles.viewport, VIEWPORT_PATTERN_STYLE]}>
        <Animated.View style={[styles.treeWrap, { transform: [{ scale: pulse }] }]}>
          <Svg height={120} shapeRendering="crispEdges" viewBox="0 0 120 120" width={120}>
            {sprite.map((pixel, index) => (
              <Rect
                fill={pixel.color}
                height={PX}
                key={`${pixel.x}-${pixel.y}-${index}`}
                width={PX}
                x={(pixel.x - SPRITE_MIN_X) * PX}
                y={(SPRITE_MAX_Y - pixel.y) * PX}
              />
            ))}
          </Svg>
        </Animated.View>

        <View style={[styles.particle, styles.particleOne, isActive && styles.particleVisible]} />
        <View style={[styles.particle, styles.particleTwo, isActive && styles.particleVisible]} />
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statRow}>
          <View style={styles.statIcon}>
            <Text style={styles.statIconLabel}>WTR</Text>
          </View>
          <View style={styles.statData}>
            <View style={styles.statLabelRow}>
              <Text style={styles.statLabel}>Hydration</Text>
              <Text style={styles.statLabel}>{waterValue}/50</Text>
            </View>
            <View style={styles.barFrame}>
              <View style={[styles.barFill, { width: `${(waterValue / 50) * 100}%` }]} />
            </View>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statIcon}>
            <Text style={styles.statIconLabel}>SUN</Text>
          </View>
          <View style={styles.statData}>
            <View style={styles.statLabelRow}>
              <Text style={styles.statLabel}>Sunlight</Text>
              <Text style={styles.statLabel}>{sunValue}/3</Text>
            </View>
            <View style={styles.barFrame}>
              <View style={[styles.barFill, styles.barFillSun, { width: `${(sunValue / 3) * 100}%` }]} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable accessibilityRole="button" style={styles.iconButton}>
          <Text style={styles.icon}>💧</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.iconButton}>
          <Text style={styles.icon}>☀️</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.iconButton}>
          <Text style={styles.icon}>✂️</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={[styles.iconButton, styles.confirmButton]}>
          <Text style={styles.icon}>✓</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>Completed sessions: {completedSessions}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  barFill: {
    backgroundColor: "#597dce",
    borderRightColor: "rgba(255,255,255,0.55)",
    borderRightWidth: 2,
    height: "100%",
  },
  barFillSun: {
    backgroundColor: "#f4b41b",
  },
  barFrame: {
    backgroundColor: "#242326",
    borderColor: "#f8f4eb",
    borderWidth: 2,
    height: 12,
    overflow: "hidden",
    width: "100%",
  },
  card: {
    backgroundColor: "#3e3b3d",
    borderColor: "#d4c6aa",
    borderRadius: 6,
    borderWidth: 3,
    gap: 12,
    marginTop: theme.spacing.lg,
    padding: 12,
    shadowColor: "rgba(0,0,0,0.55)",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 0,
  },
  confirmButton: {
    backgroundColor: "#5e2f33",
    borderColor: "#d95763",
  },
  controls: {
    borderTopColor: "#8b806d",
    borderTopWidth: 2,
    flexDirection: "row",
    gap: 6,
    paddingTop: 8,
  },
  entityName: {
    color: "#d4c6aa",
    fontFamily: theme.typography.heading,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  entityStatus: {
    color: "#b6aea0",
    fontFamily: theme.typography.body,
    fontSize: 11,
    marginTop: 4,
  },
  footer: {
    color: "#d4c6aa",
    fontFamily: theme.typography.body,
    fontSize: 10,
    opacity: 0.85,
    textTransform: "uppercase",
  },
  header: {
    alignItems: "flex-start",
    borderBottomColor: "#8b806d",
    borderBottomWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  headerMenu: {
    alignItems: "center",
    backgroundColor: "#242326",
    borderColor: "#d4c6aa",
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  headerMenuIcon: {
    color: "#f8f4eb",
    fontFamily: theme.typography.heading,
    fontSize: 11,
  },
  icon: {
    color: "#f8f4eb",
    fontFamily: theme.typography.heading,
    fontSize: 14,
    lineHeight: 16,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#3e3b3d",
    borderColor: "#d4c6aa",
    borderWidth: 2,
    flex: 1,
    height: 34,
    justifyContent: "center",
  },
  particle: {
    backgroundColor: "rgba(255,255,255,0.86)",
    height: 4,
    opacity: 0,
    position: "absolute",
    width: 4,
  },
  particleOne: {
    left: "22%",
    top: "30%",
  },
  particleTwo: {
    left: "70%",
    top: "52%",
  },
  particleVisible: {
    opacity: 0.7,
  },
  statData: {
    flex: 1,
    gap: 4,
  },
  statIcon: {
    alignItems: "center",
    backgroundColor: "#242326",
    borderColor: "#8b806d",
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    width: 32,
  },
  statIconLabel: {
    color: "#f8f4eb",
    fontFamily: theme.typography.heading,
    fontSize: 8,
    letterSpacing: 0.3,
  },
  statLabel: {
    color: "#c8c0b3",
    fontFamily: theme.typography.body,
    fontSize: 10,
    textTransform: "uppercase",
  },
  statLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  statsGrid: {
    gap: 8,
  },
  treeWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  viewport: {
    alignItems: "center",
    backgroundColor: "#5da668",
    borderColor: "#8b806d",
    borderWidth: 3,
    height: 170,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
});

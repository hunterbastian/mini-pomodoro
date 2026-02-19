/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — HistoryScreen
 *
 *    0ms   header card slides up from +14, fades in
 *  160ms   first row fades + slides up from +10
 *  +60ms   each subsequent row (staggered)
 * ───────────────────────────────────────────────────────── */

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DitherArt } from "../components/DitherArt";
import { PixelFlower } from "../components/PixelFlower";
import { historyRepo } from "../storage/historyRepo";
import { theme } from "../theme/tokens";
import type { SessionEntry } from "../types/session";

/* ─── Timing constants ──────────────────────────────────── */
const TIMING = {
  headerIn: 0,     // header slides up
  rowsIn:   160,   // first row starts appearing
};

/* ─── Element configs ───────────────────────────────────── */
const HEADER = {
  offsetY:  14,
  duration: 420,
  easing:   Easing.out(Easing.cubic),
};

const ROWS = {
  offsetY:  10,    // px rows slide up from
  duration: 300,   // per-row fade + slide
  stagger:  60,    // ms between each row
  easing:   Easing.out(Easing.cubic),
};

/* ─── Helpers ───────────────────────────────────────────── */
function formatDate(valueISO: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  }).format(new Date(valueISO));
}

function formatTime(valueISO: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour:   "numeric",
    minute: "2-digit",
  }).format(new Date(valueISO));
}

/* ─── Animated row ──────────────────────────────────────── */
function AnimatedRow({
  item,
  index,
  width,
  delay,
  useNativeDriver,
}: {
  item: SessionEntry;
  index: number;
  width: number;
  delay: number;
  useNativeDriver: boolean;
}) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(ROWS.offsetY)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: ROWS.duration, delay, easing: ROWS.easing, useNativeDriver }),
      Animated.timing(translateY, { toValue: 0, duration: ROWS.duration, delay, easing: ROWS.easing, useNativeDriver }),
    ]).start();
  }, [delay, opacity, translateY, useNativeDriver]);

  return (
    <Animated.View
      style={[
        styles.row,
        { width, opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.rowLeft}>
        <View style={styles.rowIndex}>
          <Text style={styles.rowIndexText}>{String(index + 1).padStart(2, "0")}</Text>
        </View>
        <View>
          <View style={styles.rowTitleRow}>
            <View style={styles.rowGem} />
            <Text style={styles.rowDate}>{formatDate(item.completedAtISO)}</Text>
          </View>
          <Text style={styles.rowMeta}>started {formatTime(item.startedAtISO)}</Text>
        </View>
      </View>
      <View style={styles.rowBadge}>
        <Text style={styles.rowBadgeText}>+1 SESSION</Text>
      </View>
    </Animated.View>
  );
}

/* ─── Screen ────────────────────────────────────────────── */
export function HistoryScreen() {
  const [entries, setEntries]           = useState<SessionEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1024;
  const isTablet  = width >= 768 && width < 1024;
  const horizontalInset = isDesktop ? theme.spacing.xl : isTablet ? theme.spacing.lg : theme.spacing.md;
  const contentWidth    = Math.max(280, Math.min(width - horizontalInset * 2, isDesktop ? 940 : 650));
  const useNativeDriver = Platform.OS !== "web";

  // Header entrance
  const headerOpacity    = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(HEADER.offsetY)).current;
  const mountTimers      = useRef<ReturnType<typeof setTimeout>[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const nextEntries = await historyRepo.getAll();
      setEntries(nextEntries);
      setErrorMessage(null);
    } catch {
      setErrorMessage("Could not load history.");
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadHistory(); }, [loadHistory]));

  // Run entrance storyboard on mount
  useEffect(() => {
    const t = mountTimers.current;

    t.push(setTimeout(() => {
      Animated.parallel([
        Animated.timing(headerOpacity,    { toValue: 1, duration: HEADER.duration, easing: HEADER.easing, useNativeDriver }),
        Animated.timing(headerTranslateY, { toValue: 0, duration: HEADER.duration, easing: HEADER.easing, useNativeDriver }),
      ]).start();
    }, TIMING.headerIn));

    return () => t.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ditherWidth = Math.min(contentWidth, 480);

  return (
    <SafeAreaView style={styles.root}>
      {/* Background glows */}
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={[styles.backgroundGlow, styles.backgroundGlowTop]} />
        <View style={[styles.backgroundGlow, styles.backgroundGlowBottom]} />
      </View>

      {/* Header card */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity:          headerOpacity,
            paddingHorizontal: horizontalInset,
            transform:        [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <View style={[styles.headerCard, { width: contentWidth }]}>
          <View style={styles.headerDitherWrap}>
            <DitherArt width={ditherWidth} />
          </View>
          <View style={styles.headerTextWrap}>
            <View style={styles.headerTitleRow}>
              <View>
                <Text style={styles.title}>▓ SESSION LOG</Text>
                <Text style={styles.subtitle}>FOCUS SESSIONS COMPLETED</Text>
                {entries.length > 0 && (
                  <Text style={styles.sessionCount}>
                    {entries.length} SESSION{entries.length === 1 ? "" : "S"} COMPLETE
                  </Text>
                )}
              </View>
              <PixelFlower sessionCount={entries.length} size={60} />
            </View>
          </View>
        </View>
      </Animated.View>

      {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      <FlatList
        contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalInset }]}
        data={entries}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={[styles.emptyWrap, { width: contentWidth }]}>
            <PixelFlower sessionCount={0} size={96} />
            <Text style={styles.emptyTitle}>// NO SESSIONS YET</Text>
            <Text style={styles.emptySubtitle}>Complete one focus session to begin your journal.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <AnimatedRow
            delay={TIMING.rowsIn + index * ROWS.stagger}
            index={index}
            item={item}
            useNativeDriver={useNativeDriver}
            width={contentWidth}
          />
        )}
      />
    </SafeAreaView>
  );
}

/* ─── Styles ────────────────────────────────────────────── */
const styles = StyleSheet.create({
  backgroundGlow: {
    borderRadius: 160,
    opacity: 0.6,
    position: "absolute",
  },
  backgroundGlowBottom: {
    backgroundColor: theme.colors.glowB,
    height: 380,
    right: -150,
    top: "56%",
    width: 380,
  },
  backgroundGlowTop: {
    backgroundColor: theme.colors.glowA,
    height: 420,
    left: -180,
    top: -140,
    width: 420,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    letterSpacing: 0.7,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  emptyTitle: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 13,
    letterSpacing: 1.2,
    textAlign: "center",
  },
  emptyWrap: {
    alignItems: "center",
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  errorText: {
    color: theme.colors.danger,
    fontFamily: theme.typography.mono,
    fontSize: 12,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  headerCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    overflow: "hidden",
    shadowColor: theme.colors.glowShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.65,
    shadowRadius: 18,
  },
  headerDitherWrap: {
    width: "100%",
  },
  headerTextWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerTitleRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  listContent: {
    alignItems: "center",
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
  },
  root: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  row: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
  },
  rowBadge: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  rowBadgeText: {
    color: theme.colors.accent,
    fontFamily: theme.typography.mono,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  rowDate: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  rowGem: {
    backgroundColor: theme.colors.accent,
    borderRadius: 1,
    height: 7,
    marginRight: 8,
    marginTop: 1,
    opacity: 0.85,
    width: 7,
  },
  rowIndex: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    marginRight: theme.spacing.md,
    width: 34,
  },
  rowIndexText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.mono,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  rowLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  rowMeta: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.mono,
    fontSize: 10,
    letterSpacing: 0.4,
    marginTop: 3,
  },
  rowTitleRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  sessionCount: {
    color: theme.colors.accent,
    fontFamily: theme.typography.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    marginTop: 5,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  title: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 13,
    letterSpacing: 1.4,
  },
});

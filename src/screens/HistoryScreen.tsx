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

import { historyRepo } from "../storage/historyRepo";
import { theme } from "../theme/tokens";
import type { SessionEntry } from "../types/session";

function formatDate(valueISO: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(valueISO));
}

function formatTime(valueISO: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(valueISO));
}

export function HistoryScreen() {
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const horizontalInset = isDesktop ? theme.spacing.xl : isTablet ? theme.spacing.lg : theme.spacing.md;
  const contentWidth = Math.max(280, Math.min(width - horizontalInset * 2, isDesktop ? 940 : 650));
  const shouldUseNativeDriver = Platform.OS !== "web";

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(10)).current;

  const loadHistory = useCallback(async () => {
    try {
      const nextEntries = await historyRepo.getAll();
      setEntries(nextEntries);
      setErrorMessage(null);
    } catch {
      setErrorMessage("Could not load history.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  useEffect(() => {
    fadeAnim.setValue(0);
    translateAnim.setValue(10);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: shouldUseNativeDriver,
      }),
      Animated.timing(translateAnim, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: shouldUseNativeDriver,
      }),
    ]).start();
  }, [fadeAnim, shouldUseNativeDriver, translateAnim]);

  return (
    <SafeAreaView style={styles.root}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={[styles.backgroundGlow, styles.backgroundGlowTop]} />
        <View style={[styles.backgroundGlow, styles.backgroundGlowBottom]} />
      </View>

      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            paddingHorizontal: horizontalInset,
            transform: [{ translateY: translateAnim }],
          },
        ]}
      >
        <View style={[styles.headerCard, { width: contentWidth }]}>
          <Text style={styles.title}>SESSION LOG</Text>
          <Text style={styles.subtitle}>COMPLETED FOCUS BLOCKS</Text>
        </View>
      </Animated.View>

      {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      <FlatList
        contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalInset }]}
        data={entries}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={[styles.emptyWrap, { width: contentWidth }]}>
            <Text style={styles.emptyTitle}>NO SESSIONS YET</Text>
            <Text style={styles.emptySubtitle}>COMPLETE ONE 25-MINUTE BLOCK TO START YOUR LOG.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { width: contentWidth }]}>
            <Text style={styles.rowDate}>{formatDate(item.completedAtISO)}</Text>
            <Text style={styles.rowMeta}>Started {formatTime(item.startedAtISO)}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundGlow: {
    borderRadius: 999,
    opacity: 0.45,
    position: "absolute",
  },
  backgroundGlowBottom: {
    backgroundColor: theme.colors.glowB,
    height: 220,
    right: -90,
    top: "58%",
    width: 220,
  },
  backgroundGlowTop: {
    backgroundColor: theme.colors.glowA,
    height: 240,
    left: -100,
    top: -70,
    width: 240,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  emptySubtitle: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 12,
    letterSpacing: 0.8,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.mono,
    fontSize: 17,
    letterSpacing: 1.4,
    textAlign: "center",
  },
  emptyWrap: {
    alignItems: "center",
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  errorText: {
    color: theme.colors.danger,
    fontFamily: theme.typography.body,
    fontSize: 13,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  headerCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    shadowColor: "#3A2E20",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
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
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  rowDate: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.mono,
    fontSize: 13,
    letterSpacing: 0.8,
  },
  rowMeta: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body,
    fontSize: 13,
    marginTop: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: theme.spacing.xs,
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.mono,
    fontSize: 16,
    letterSpacing: 1.6,
  },
});

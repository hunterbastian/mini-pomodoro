import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CircularTimer } from "../components/CircularTimer";
import { timerStore } from "../state/timerStore";
import { historyRepo } from "../storage/historyRepo";
import { SESSION_DURATION_SEC, type SessionEntry } from "../types/session";
import { theme } from "../theme/tokens";
import type { PersistedRunState } from "../types/session";
import { computeRemainingSec, POMODORO_SECONDS } from "../utils/time";
import { playCompletionChimeAsync } from "../utils/chime";
import { sendCompletionNotificationAsync } from "../utils/notifications";
import { logAnalyticsEvent } from "../utils/analytics";

function statusLabel(status: PersistedRunState["status"]): string {
  if (status === "running") {
    return "RUNNING";
  }

  if (status === "paused") {
    return "PAUSED";
  }

  return "READY";
}

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

const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1024;
const TABLET_MAX_WIDTH = 650;
const DESKTOP_MAX_WIDTH = 720;
const DESKTOP_SHELL_MAX_WIDTH = 1180;

export function TimerScreen() {
  const [runState, setRunState] = useState<PersistedRunState>(timerStore.getIdleState());
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCompletionModalVisible, setIsCompletionModalVisible] = useState(false);

  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT;
  const isNarrow = width < 430;
  const horizontalInset = isDesktop ? theme.spacing.xl : isTablet ? theme.spacing.lg : theme.spacing.md;
  const stackedContentWidth = Math.max(
    280,
    Math.min(
      width - horizontalInset * 2,
      isTablet ? TABLET_MAX_WIDTH : DESKTOP_MAX_WIDTH,
    ),
  );
  const desktopShellWidth = Math.max(
    920,
    Math.min(width - horizontalInset * 2, DESKTOP_SHELL_MAX_WIDTH),
  );
  const desktopHeroWidth = Math.min(620, Math.max(520, desktopShellWidth * 0.56));
  const desktopHistoryWidth = desktopShellWidth - desktopHeroWidth - theme.spacing.lg;
  const timerSize = Math.max(
    208,
    Math.min(
      (isDesktop ? desktopHeroWidth : stackedContentWidth) - 72,
      isDesktop ? 332 : isTablet ? 270 : 250,
    ),
  );
  const shouldUseNativeDriver = Platform.OS !== "web";

  const completionLockRef = useRef(false);
  const runStateRef = useRef(runState);

  const heroOpacityAnim = useRef(new Animated.Value(0)).current;
  const heroTranslateAnim = useRef(new Animated.Value(10)).current;
  const sectionOpacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.94)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void logAnalyticsEvent("mini_pomodoro_opened");
  }, []);

  useEffect(() => {
    runStateRef.current = runState;
  }, [runState]);

  useEffect(() => {
    heroOpacityAnim.setValue(0);
    heroTranslateAnim.setValue(10);
    sectionOpacityAnim.setValue(0);

    Animated.parallel([
      Animated.timing(heroOpacityAnim, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: shouldUseNativeDriver,
      }),
      Animated.timing(heroTranslateAnim, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: shouldUseNativeDriver,
      }),
      Animated.timing(sectionOpacityAnim, {
        delay: 120,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: shouldUseNativeDriver,
      }),
    ]).start();
  }, [heroOpacityAnim, heroTranslateAnim, sectionOpacityAnim, shouldUseNativeDriver]);

  useEffect(() => {
    if (runState.status !== "running") {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      return;
    }

    pulseAnim.setValue(0.66);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          duration: 920,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: shouldUseNativeDriver,
        }),
        Animated.timing(pulseAnim, {
          duration: 920,
          easing: Easing.inOut(Easing.sin),
          toValue: 0.66,
          useNativeDriver: shouldUseNativeDriver,
        }),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
      pulseAnim.setValue(1);
    };
  }, [pulseAnim, runState.status, shouldUseNativeDriver]);

  useEffect(() => {
    if (!isCompletionModalVisible) {
      modalScaleAnim.setValue(0.94);
      modalOpacityAnim.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(modalScaleAnim, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: shouldUseNativeDriver,
      }),
      Animated.timing(modalOpacityAnim, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: shouldUseNativeDriver,
      }),
    ]).start();
  }, [isCompletionModalVisible, modalOpacityAnim, modalScaleAnim, shouldUseNativeDriver]);

  const loadHistory = useCallback(async () => {
    try {
      const nextEntries = await historyRepo.getAll();
      setEntries(nextEntries);
      setHistoryErrorMessage(null);
      await logAnalyticsEvent("pomodoro_history_loaded", {
        entry_count: nextEntries.length,
      });
    } catch {
      setHistoryErrorMessage("Could not load history.");
      await logAnalyticsEvent("pomodoro_history_load_failed");
    }
  }, []);

  const syncFromStorage = useCallback(async () => {
    const hydrated = await timerStore.hydrate();
    setRunState(hydrated);
    return hydrated;
  }, []);

  useEffect(() => {
    let isActive = true;

    const hydrateOnMount = async () => {
      try {
        const hydrated = await timerStore.hydrate();
        if (isActive) {
          setRunState(hydrated);
          setErrorMessage(null);
        }
      } catch {
        if (isActive) {
          setErrorMessage("Could not load timer state.");
        }
      } finally {
        if (isActive) {
          setIsHydrated(true);
        }
      }
    };

    void hydrateOnMount();

    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        void logAnalyticsEvent("mini_pomodoro_foregrounded");
        void syncFromStorage();
      }
    });

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, [syncFromStorage]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (runState.status !== "running" || runState.endAtEpochMs === null) {
      return;
    }

    const interval = setInterval(() => {
      setRunState((previous) => {
        if (previous.status !== "running" || previous.endAtEpochMs === null) {
          return previous;
        }

        return {
          ...previous,
          remainingSec: computeRemainingSec(previous.endAtEpochMs),
        };
      });
    }, 250);

    return () => {
      clearInterval(interval);
    };
  }, [runState.status, runState.endAtEpochMs]);

  const completeSession = useCallback(async () => {
    if (completionLockRef.current) {
      return;
    }

    completionLockRef.current = true;

    const activeState = runStateRef.current;
    const completedAtISO = new Date().toISOString();
    const startedAtISO = activeState.startedAtISO ?? completedAtISO;

    try {
      await sendCompletionNotificationAsync();
      await playCompletionChimeAsync();
      await historyRepo.append({
        id: `${Date.now()}`,
        startedAtISO,
        completedAtISO,
        durationSec: SESSION_DURATION_SEC,
      });
      await logAnalyticsEvent("pomodoro_completed", {
        duration_sec: SESSION_DURATION_SEC,
      });
      setErrorMessage(null);
      await loadHistory();
    } catch {
      setErrorMessage("Session finished, but history save failed.");
    } finally {
      try {
        await timerStore.reset();
        await syncFromStorage();
      } catch {
        setRunState(timerStore.getIdleState());
      }
      setIsCompletionModalVisible(true);
      completionLockRef.current = false;
    }
  }, [loadHistory, syncFromStorage]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (runState.status === "running" && runState.remainingSec <= 0) {
      void completeSession();
    }
  }, [completeSession, isHydrated, runState.remainingSec, runState.status]);

  const handlePrimaryPress = useCallback(async () => {
    try {
      setErrorMessage(null);

      if (runState.status === "running") {
        await timerStore.pause();
        await logAnalyticsEvent("pomodoro_paused", {
          remaining_sec: runState.remainingSec,
        });
      } else if (runState.status === "paused") {
        await timerStore.resume();
        await logAnalyticsEvent("pomodoro_resumed", {
          remaining_sec: runState.remainingSec,
        });
      } else {
        setIsCompletionModalVisible(false);
        await timerStore.start();
        await logAnalyticsEvent("pomodoro_started", {
          duration_sec: SESSION_DURATION_SEC,
        });
      }

      await syncFromStorage();
    } catch {
      setErrorMessage("Could not update timer.");
    }
  }, [runState.remainingSec, runState.status, syncFromStorage]);

  const handleResetPress = useCallback(async () => {
    try {
      await timerStore.reset();
      await logAnalyticsEvent("pomodoro_reset", {
        remaining_sec: runState.remainingSec,
      });
      await syncFromStorage();
      setErrorMessage(null);
    } catch {
      setErrorMessage("Could not reset timer.");
    }
  }, [runState.remainingSec, syncFromStorage]);

  const dismissCompletionModal = useCallback(() => {
    setIsCompletionModalVisible(false);
  }, []);

  const handleStartNextSession = useCallback(async () => {
    try {
      setIsCompletionModalVisible(false);
      setErrorMessage(null);
      await timerStore.start();
      await logAnalyticsEvent("pomodoro_started_from_modal", {
        duration_sec: SESSION_DURATION_SEC,
      });
      await syncFromStorage();
    } catch {
      setErrorMessage("Could not start next session.");
    }
  }, [syncFromStorage]);

  const primaryLabel = runState.status === "running" ? "Pause" : "Start";
  const resetDisabled =
    runState.status === "idle" && runState.remainingSec === POMODORO_SECONDS;
  const subtitle = useMemo(() => statusLabel(runState.status), [runState.status]);
  const signalDotCount = 24;
  const activeSignalDots = Math.max(
    1,
    Math.ceil((runState.remainingSec / SESSION_DURATION_SEC) * signalDotCount),
  );
  const activeDotMotionStyle = runState.status === "running" ? { opacity: pulseAnim } : null;
  const heroWidth = isDesktop ? desktopHeroWidth : stackedContentWidth;
  const historyWidth = isDesktop ? desktopHistoryWidth : stackedContentWidth;
  const modalWidth = Math.min(isDesktop ? desktopHistoryWidth : stackedContentWidth, 420);

  const heroCard = (
    <Animated.View
      style={[
        styles.heroSection,
        {
          opacity: heroOpacityAnim,
          transform: [{ translateY: heroTranslateAnim }],
        },
      ]}
    >
      <View style={styles.signalRow}>
        {Array.from({ length: signalDotCount }, (_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.signalDot,
              index < activeSignalDots && styles.signalDotActive,
              index < activeSignalDots && activeDotMotionStyle,
            ]}
          />
        ))}
      </View>
      <Text style={styles.kicker}>MINI POMODORO</Text>
      <Text style={[styles.title, { fontSize: isDesktop ? 24 : 22 }]}>FOCUS MODE</Text>

      <View style={styles.timerCard}>
        <CircularTimer
          remainingSec={runState.remainingSec}
          size={timerSize}
          totalSec={SESSION_DURATION_SEC}
        />
        <Text style={styles.statusText}>{subtitle}</Text>
      </View>

      <View style={[styles.controlsRow, isNarrow && styles.controlsRowStacked]}>
        <Pressable
          accessibilityRole="button"
          onPress={handlePrimaryPress}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={resetDisabled}
          onPress={handleResetPress}
          style={({ pressed }) => [
            styles.secondaryButton,
            resetDisabled && styles.secondaryButtonDisabled,
            pressed && !resetDisabled && styles.buttonPressed,
          ]}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              resetDisabled && styles.secondaryButtonTextDisabled,
            ]}
          >
            Reset
          </Text>
        </Pressable>
      </View>

      {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={[styles.backgroundGlow, styles.backgroundGlowTop]} />
        <View style={[styles.backgroundGlow, styles.backgroundGlowBottom]} />
      </View>

      {isDesktop ? (
        <View
          style={[
            styles.desktopShell,
            {
              paddingHorizontal: horizontalInset,
              paddingTop: theme.spacing.lg,
            },
          ]}
        >
          <View style={[styles.desktopGrid, { width: desktopShellWidth }]}>
            <View style={{ width: heroWidth }}>{heroCard}</View>

            <View style={[styles.desktopHistoryPanel, { width: historyWidth }]}>
              <Animated.View style={[styles.historyHeaderDesktop, { opacity: sectionOpacityAnim }]}>
                <Text style={styles.historyTitle}>SESSION LOG</Text>
                <Text style={styles.historySubtitle}>COMPLETED 25-MINUTE BLOCKS</Text>
                {!!historyErrorMessage && (
                  <Text style={styles.errorText}>{historyErrorMessage}</Text>
                )}
              </Animated.View>

              <FlatList
                contentContainerStyle={styles.desktopHistoryListContent}
                data={entries}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <View style={[styles.emptyWrap, styles.emptyWrapDesktop]}>
                    <Text style={styles.emptyTitle}>NO SESSIONS YET</Text>
                    <Text style={styles.emptySubtitle}>
                      COMPLETE ONE FOCUS BLOCK TO START THE LOG.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={[styles.row, styles.rowFullWidth]}>
                    <Text style={styles.rowDate}>{formatDate(item.completedAtISO)}</Text>
                    <Text style={styles.rowMeta}>Started {formatTime(item.startedAtISO)}</Text>
                  </View>
                )}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            {
              paddingHorizontal: horizontalInset,
              paddingTop: theme.spacing.md,
            },
          ]}
          data={entries}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={{ width: stackedContentWidth }}>
              {heroCard}

              <Animated.View style={[styles.historyHeader, { opacity: sectionOpacityAnim }]}>
                <Text style={styles.historyTitle}>SESSION LOG</Text>
                <Text style={styles.historySubtitle}>COMPLETED 25-MINUTE BLOCKS</Text>
                {!!historyErrorMessage && (
                  <Text style={styles.errorText}>{historyErrorMessage}</Text>
                )}
              </Animated.View>
            </View>
          }
          ListEmptyComponent={
            <View style={[styles.emptyWrap, { width: stackedContentWidth }]}>
              <Text style={styles.emptyTitle}>NO SESSIONS YET</Text>
              <Text style={styles.emptySubtitle}>COMPLETE ONE FOCUS BLOCK TO START THE LOG.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.row, { width: stackedContentWidth }]}>
              <Text style={styles.rowDate}>{formatDate(item.completedAtISO)}</Text>
              <Text style={styles.rowMeta}>Started {formatTime(item.startedAtISO)}</Text>
            </View>
          )}
        />
      )}

      <Modal
        animationType="fade"
        onRequestClose={dismissCompletionModal}
        transparent
        visible={isCompletionModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View
            style={[
              styles.modalCard,
              {
                opacity: modalOpacityAnim,
                transform: [{ scale: modalScaleAnim }],
                width: modalWidth,
              },
            ]}
          >
            <Text style={styles.modalKicker}>FOCUS COMPLETE</Text>
            <Text style={styles.modalTitle}>Nice work.</Text>
            <Text style={styles.modalBody}>
              Your timer finished. Take a quick break or jump straight into another focus block.
            </Text>

            <View style={[styles.modalActions, isNarrow && styles.modalActionsStacked]}>
              <Pressable
                accessibilityRole="button"
                onPress={dismissCompletionModal}
                style={({ pressed }) => [
                  styles.modalSecondaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.modalSecondaryButtonText}>Close</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleStartNextSession}
                style={({ pressed }) => [styles.modalPrimaryButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.modalPrimaryButtonText}>Start Next</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
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
    height: 280,
    right: -110,
    top: "62%",
    width: 280,
  },
  backgroundGlowTop: {
    backgroundColor: theme.colors.glowA,
    height: 320,
    left: -140,
    top: -90,
    width: 320,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  controlsRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
    width: "100%",
  },
  controlsRowStacked: {
    flexDirection: "column",
  },
  desktopGrid: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.lg,
  },
  desktopHistoryListContent: {
    paddingBottom: theme.spacing.sm,
  },
  desktopHistoryPanel: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    maxHeight: 620,
    minHeight: 520,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    shadowColor: "#4A3A2A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  desktopShell: {
    alignItems: "center",
    flex: 1,
  },
  emptySubtitle: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 12,
    letterSpacing: 0.8,
    marginTop: theme.spacing.sm,
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
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyWrapDesktop: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.danger,
    fontFamily: theme.typography.body,
    fontSize: 12,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  heroSection: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    shadowColor: "#4A3A2A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  historyHeader: {
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  historyHeaderDesktop: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  historySubtitle: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: theme.spacing.xs,
  },
  historyTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.mono,
    fontSize: 16,
    letterSpacing: 1.6,
  },
  kicker: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 12,
    letterSpacing: 1.8,
    marginTop: theme.spacing.xs,
  },
  listContent: {
    alignItems: "center",
    paddingBottom: theme.spacing.xl,
  },
  modalActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    width: "100%",
  },
  modalActionsStacked: {
    flexDirection: "column-reverse",
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: theme.colors.overlay,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  modalBody: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  modalCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    shadowColor: "#4A3A2A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
  },
  modalKicker: {
    color: theme.colors.accentSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  modalPrimaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  modalPrimaryButtonText: {
    color: theme.colors.background,
    fontFamily: theme.typography.mono,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  modalSecondaryButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  modalSecondaryButtonText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.mono,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.mono,
    fontSize: 23,
    letterSpacing: 1.4,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontFamily: theme.typography.mono,
    fontSize: 14,
    letterSpacing: 1.2,
    textTransform: "uppercase",
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
  rowFullWidth: {
    width: "100%",
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
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  secondaryButtonDisabled: {
    opacity: 0.4,
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.mono,
    fontSize: 14,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  secondaryButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
  signalDot: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  signalDotActive: {
    backgroundColor: theme.colors.accent,
  },
  signalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
    width: 180,
  },
  statusText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: theme.spacing.sm,
  },
  timerCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    width: "100%",
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.mono,
    letterSpacing: 2.2,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
});

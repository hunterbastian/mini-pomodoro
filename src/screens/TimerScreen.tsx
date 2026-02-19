import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type AppStateStatus,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AchievementBadge } from "../components/AchievementBadge";
import { CircularTimer } from "../components/CircularTimer";
import { PixelSceneryBackground } from "../components/PixelSceneryBackground";
import { QuestList, type QuestItem } from "../components/QuestList";
import { StickerJournal } from "../components/StickerJournal";
import { StarburstActionButton } from "../components/StarburstActionButton";
import { TreeGrowthCard } from "../components/TreeGrowthCard";
import { timerStore } from "../state/timerStore";
import { historyRepo } from "../storage/historyRepo";
import type { PersistedRunState, SessionEntry } from "../types/session";
import { SESSION_DURATION_SEC } from "../types/session";
import { theme } from "../theme/tokens";
import { playCompletionChimeAsync } from "../utils/chime";
import {
  ensureBrowserAlarmPermissionAsync,
  sendCompletionNotificationAsync,
} from "../utils/notifications";
import { computeRemainingSec, POMODORO_SECONDS } from "../utils/time";
import { logAnalyticsEvent } from "../utils/analytics";

type BreakMode = "short_break" | "long_break";
type SessionMode = "focus" | BreakMode;
type BreakRunStatus = "idle" | "running" | "paused";

type BreakRunState = {
  endAtEpochMs: number | null;
  mode: BreakMode;
  remainingSec: number;
  status: BreakRunStatus;
};

const SHORT_BREAK_SECONDS = 5 * 60;
const LONG_BREAK_SECONDS = 15 * 60;

const QUESTS: QuestItem[] = [
  { id: "deep-work-sprint", title: "Deep Work Sprint", durationLabel: "25m" },
  { id: "code-review-pass", title: "Code Review Pass", durationLabel: "25m" },
  { id: "project-planning", title: "Project Planning", durationLabel: "25m" },
  { id: "inbox-triage", title: "Inbox Triage", durationLabel: "25m" },
];

const PANEL_PATTERN_STYLE: ViewStyle = Platform.OS === "web"
  ? ({
      backgroundImage:
        "linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.04) 75%)",
      backgroundPosition: "0 0, 0 20px, 20px -20px, -20px 0px",
      backgroundSize: "40px 40px",
    } as unknown as ViewStyle)
  : {};

function getBreakDuration(mode: BreakMode): number {
  return mode === "short_break" ? SHORT_BREAK_SECONDS : LONG_BREAK_SECONDS;
}

function createBreakState(mode: BreakMode): BreakRunState {
  return {
    endAtEpochMs: null,
    mode,
    remainingSec: getBreakDuration(mode),
    status: "idle",
  };
}

function modeDisplay(mode: SessionMode): string {
  if (mode === "focus") return "Focus Session";
  if (mode === "short_break") return "Short Break";
  return "Long Break";
}

function primaryActionLabel(mode: SessionMode, status: PersistedRunState["status"] | BreakRunStatus): string {
  if (status === "running") return "Pause";
  if (status === "paused") return "Resume";
  if (mode === "focus") return "Focus";
  return "Start";
}

function formatTimer(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(clamped / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((clamped % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (clamped % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function TimerScreen() {
  const [runState, setRunState] = useState<PersistedRunState>(timerStore.getIdleState());
  const [breakState, setBreakState] = useState<BreakRunState>(() => createBreakState("short_break"));
  const [selectedMode, setSelectedMode] = useState<SessionMode>("focus");
  const [activeQuestId, setActiveQuestId] = useState<string>(QUESTS[0]!.id);
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCompletionModalVisible, setIsCompletionModalVisible] = useState(false);
  const [lastCompletedMode, setLastCompletedMode] = useState<SessionMode>("focus");

  const completionLockRef = useRef(false);
  const runStateRef = useRef(runState);

  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const timerSize = isDesktop ? 300 : Math.max(200, Math.min(width - 120, 268));

  useEffect(() => {
    runStateRef.current = runState;
  }, [runState]);

  const loadHistory = useCallback(async () => {
    try {
      const nextEntries = await historyRepo.getAll();
      setEntries(nextEntries);
      setHistoryErrorMessage(null);
      await logAnalyticsEvent("pomodoro_history_loaded", { entry_count: nextEntries.length });
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
    void loadHistory();

    const appStateSub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") {
        void syncFromStorage();
      }
    });

    return () => {
      isActive = false;
      appStateSub.remove();
    };
  }, [loadHistory, syncFromStorage]);

  useEffect(() => {
    if (runState.status !== "running" || runState.endAtEpochMs === null) {
      return;
    }

    const interval = setInterval(() => {
      setRunState((prev) => {
        if (prev.status !== "running" || prev.endAtEpochMs === null) {
          return prev;
        }

        return {
          ...prev,
          remainingSec: computeRemainingSec(prev.endAtEpochMs),
        };
      });
    }, 250);

    return () => clearInterval(interval);
  }, [runState.endAtEpochMs, runState.status]);

  useEffect(() => {
    if (breakState.status !== "running" || breakState.endAtEpochMs === null) {
      return;
    }

    const interval = setInterval(() => {
      setBreakState((prev) => {
        if (prev.status !== "running" || prev.endAtEpochMs === null) {
          return prev;
        }

        return {
          ...prev,
          remainingSec: Math.max(0, Math.ceil((prev.endAtEpochMs - Date.now()) / 1000)),
        };
      });
    }, 250);

    return () => clearInterval(interval);
  }, [breakState.endAtEpochMs, breakState.status]);

  const completeFocusSession = useCallback(async () => {
    if (completionLockRef.current) {
      return;
    }

    completionLockRef.current = true;

    const active = runStateRef.current;
    const completedAtISO = new Date().toISOString();
    const startedAtISO = active.startedAtISO ?? completedAtISO;

    try {
      await sendCompletionNotificationAsync();
      await playCompletionChimeAsync();

      await historyRepo.append({
        id: `${Date.now()}`,
        startedAtISO,
        completedAtISO,
        durationSec: SESSION_DURATION_SEC,
      });

      await logAnalyticsEvent("pomodoro_completed", { duration_sec: SESSION_DURATION_SEC });
      setErrorMessage(null);

      await loadHistory();

      setActiveQuestId((currentQuest) => {
        const currentIndex = QUESTS.findIndex((quest) => quest.id === currentQuest);
        const normalizedIndex = currentIndex < 0 ? 0 : currentIndex;
        return QUESTS[(normalizedIndex + 1) % QUESTS.length]!.id;
      });
    } catch {
      setErrorMessage("Session finished, but history save failed.");
    } finally {
      try {
        await timerStore.reset();
        await syncFromStorage();
      } catch {
        setRunState(timerStore.getIdleState());
      }

      setLastCompletedMode("focus");
      setIsCompletionModalVisible(true);
      completionLockRef.current = false;
    }
  }, [loadHistory, syncFromStorage]);

  const completeBreakSession = useCallback(async () => {
    if (completionLockRef.current) {
      return;
    }

    completionLockRef.current = true;

    try {
      await sendCompletionNotificationAsync();
      await playCompletionChimeAsync();
      await logAnalyticsEvent("pomodoro_break_completed", { mode: breakState.mode });
      setErrorMessage(null);
    } catch {
      setErrorMessage("Break finished, but alarm failed.");
    } finally {
      setBreakState(createBreakState(breakState.mode));
      setLastCompletedMode(breakState.mode);
      setIsCompletionModalVisible(true);
      completionLockRef.current = false;
    }
  }, [breakState.mode]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (runState.status === "running" && runState.remainingSec <= 0) {
      void completeFocusSession();
    }
  }, [completeFocusSession, isHydrated, runState.remainingSec, runState.status]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (breakState.status === "running" && breakState.remainingSec <= 0) {
      void completeBreakSession();
    }
  }, [breakState.remainingSec, breakState.status, completeBreakSession, isHydrated]);

  const handleModeSelect = useCallback(
    async (nextMode: SessionMode) => {
      if (nextMode === selectedMode) {
        return;
      }

      try {
        setErrorMessage(null);
        setIsCompletionModalVisible(false);

        if (runState.status !== "idle") {
          await timerStore.reset();
          await syncFromStorage();
        }

        if (nextMode === "focus") {
          setBreakState((prev) => createBreakState(prev.mode));
        } else {
          setBreakState(createBreakState(nextMode));
        }

        setSelectedMode(nextMode);
        await logAnalyticsEvent("pomodoro_mode_switched", { mode: nextMode });
      } catch {
        setErrorMessage("Could not switch mode.");
      }
    },
    [runState.status, selectedMode, syncFromStorage],
  );

  const handlePrimaryPress = useCallback(async () => {
    try {
      setErrorMessage(null);

      if (selectedMode === "focus") {
        if (runState.status === "running") {
          await timerStore.pause();
          await logAnalyticsEvent("pomodoro_paused", { remaining_sec: runState.remainingSec });
        } else if (runState.status === "paused") {
          await ensureBrowserAlarmPermissionAsync();
          await timerStore.resume();
          await logAnalyticsEvent("pomodoro_resumed", { remaining_sec: runState.remainingSec });
        } else {
          setIsCompletionModalVisible(false);
          await ensureBrowserAlarmPermissionAsync();
          await timerStore.start();
          await logAnalyticsEvent("pomodoro_started", { duration_sec: SESSION_DURATION_SEC });
        }

        await syncFromStorage();
        return;
      }

      if (breakState.status === "running") {
        setBreakState((prev) => ({
          ...prev,
          endAtEpochMs: null,
          status: "paused",
        }));
        await logAnalyticsEvent("pomodoro_break_paused", {
          mode: selectedMode,
          remaining_sec: breakState.remainingSec,
        });
        return;
      }

      await ensureBrowserAlarmPermissionAsync();

      if (breakState.status === "paused") {
        const now = Date.now();
        setBreakState((prev) => ({
          ...prev,
          endAtEpochMs: now + prev.remainingSec * 1000,
          status: "running",
        }));
        await logAnalyticsEvent("pomodoro_break_resumed", {
          mode: selectedMode,
          remaining_sec: breakState.remainingSec,
        });
        return;
      }

      const now = Date.now();
      const durationSec = getBreakDuration(selectedMode);

      setBreakState({
        endAtEpochMs: now + durationSec * 1000,
        mode: selectedMode,
        remainingSec: durationSec,
        status: "running",
      });

      await logAnalyticsEvent("pomodoro_break_started", {
        duration_sec: durationSec,
        mode: selectedMode,
      });
    } catch {
      setErrorMessage("Could not update timer.");
    }
  }, [
    breakState.remainingSec,
    breakState.status,
    runState.remainingSec,
    runState.status,
    selectedMode,
    syncFromStorage,
  ]);

  const handleResetPress = useCallback(async () => {
    try {
      setErrorMessage(null);

      if (selectedMode === "focus") {
        await timerStore.reset();
        await syncFromStorage();
        await logAnalyticsEvent("pomodoro_reset", { remaining_sec: runState.remainingSec });
        return;
      }

      setBreakState(createBreakState(selectedMode));
      await logAnalyticsEvent("pomodoro_break_reset", { mode: selectedMode });
    } catch {
      setErrorMessage("Could not reset timer.");
    }
  }, [runState.remainingSec, selectedMode, syncFromStorage]);

  const dismissCompletionModal = useCallback(() => setIsCompletionModalVisible(false), []);

  const handleStartNextSession = useCallback(async () => {
    try {
      setIsCompletionModalVisible(false);
      setSelectedMode("focus");
      setBreakState((prev) => createBreakState(prev.mode));
      await ensureBrowserAlarmPermissionAsync();
      await timerStore.start();
      await syncFromStorage();
      await logAnalyticsEvent("pomodoro_started_from_modal", { duration_sec: SESSION_DURATION_SEC });
    } catch {
      setErrorMessage("Could not start next session.");
    }
  }, [syncFromStorage]);

  const activeStatus = selectedMode === "focus" ? runState.status : breakState.status;
  const remainingSec = selectedMode === "focus" ? runState.remainingSec : breakState.remainingSec;
  const isFocusRunning = selectedMode === "focus" && runState.status === "running";
  const focusProgress = Math.max(0, Math.min(1, 1 - runState.remainingSec / SESSION_DURATION_SEC));

  const primaryActionText = primaryActionLabel(selectedMode, activeStatus);
  const timerLabel = formatTimer(remainingSec);
  const modeLabel = modeDisplay(selectedMode);

  const activeQuest = useMemo(() => {
    return QUESTS.find((quest) => quest.id === activeQuestId) ?? QUESTS[0]!;
  }, [activeQuestId]);

  const resetDisabled =
    activeStatus === "idle" &&
    remainingSec === (selectedMode === "focus" ? SESSION_DURATION_SEC : getBreakDuration(selectedMode));

  const modalCopy = useMemo(() => {
    if (lastCompletedMode === "focus") {
      return {
        body: "You wrapped up a full focus block. Take a short break or continue your next quest.",
        title: "Session complete!",
      };
    }

    if (lastCompletedMode === "short_break") {
      return {
        body: "Short break complete. Jump back into your current quest when ready.",
        title: "Break finished",
      };
    }

    return {
      body: "Long break complete. Your focus streak is ready for another run.",
      title: "Recovered and ready",
    };
  }, [lastCompletedMode]);

  const leftPanel = (
    <View style={[styles.leftPanel, PANEL_PATTERN_STYLE, !isDesktop && styles.leftPanelMobile]}>
      <View style={styles.timerDisplay}>
        <Text style={styles.heartIcon}>❤️</Text>
        <Text style={styles.timerDisplayText}>{timerLabel}</Text>
      </View>

      <Text style={styles.leftPanelHint}>Session Modes</Text>

      <View style={styles.controlStack}>
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleModeSelect("focus")}
          style={({ pressed }) => [
            styles.btnPill,
            selectedMode === "focus" && styles.btnPillActive,
            pressed && styles.btnPillPressed,
          ]}
        >
          <Text style={[styles.btnPillText, selectedMode === "focus" && styles.btnPillTextActive]}>Focus</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => void handleModeSelect("short_break")}
          style={({ pressed }) => [
            styles.btnPill,
            selectedMode === "short_break" && styles.btnPillActive,
            pressed && styles.btnPillPressed,
          ]}
        >
          <Text style={[styles.btnPillText, selectedMode === "short_break" && styles.btnPillTextActive]}>
            Short Break
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => void handleModeSelect("long_break")}
          style={({ pressed }) => [
            styles.btnPill,
            styles.btnPillSecondary,
            selectedMode === "long_break" && styles.btnPillActive,
            pressed && styles.btnPillPressed,
          ]}
        >
          <Text style={[styles.btnPillText, selectedMode === "long_break" && styles.btnPillTextActive]}>
            Long Break
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={resetDisabled}
          onPress={() => void handleResetPress()}
          style={({ pressed }) => [
            styles.resetButton,
            resetDisabled && styles.resetButtonDisabled,
            pressed && !resetDisabled && styles.resetButtonPressed,
          ]}
        >
          <Text style={styles.resetButtonText}>Reset</Text>
        </Pressable>
      </View>

      <View style={styles.settingsGrid}>
        <Pressable accessibilityRole="button" style={styles.squareButton}>
          <Text style={styles.squareButtonIcon}>☀️</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.squareButton}>
          <Text style={styles.squareButtonIcon}>⚙️</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.squareButton}>
          <Text style={styles.squareButtonIcon}>?</Text>
        </Pressable>
      </View>

      {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
    </View>
  );

  const centerPanel = (
    <View style={[styles.centerPanel, !isDesktop && styles.centerPanelMobile]}>
      <View style={styles.centerPanelInner}>
        <Text style={styles.modeTitle}>{modeLabel}</Text>

        <View style={styles.timerRingWrap}>
          <CircularTimer
            remainingSec={remainingSec}
            size={timerSize}
            totalSec={selectedMode === "focus" ? SESSION_DURATION_SEC : getBreakDuration(selectedMode)}
          />
        </View>

        <View style={styles.sunRow}>
          <Text style={styles.sunIcon}>☀️</Text>
          <Text style={styles.sunText}>{isFocusRunning ? "sunlight building" : "sunlight idle"}</Text>
        </View>

        <Text style={styles.breatherCopy}>Settle in and take a breather.</Text>

        <StarburstActionButton
          isRunning={activeStatus === "running"}
          label={primaryActionText}
          onPress={handlePrimaryPress}
          size={isDesktop ? 190 : 170}
        />
      </View>
    </View>
  );

  const rightPanel = (
    <View style={[styles.rightPanel, !isDesktop && styles.rightPanelMobile]}>
      <ScrollView contentContainerStyle={styles.rightContent} showsVerticalScrollIndicator={false}>
        <View style={styles.taskHeader}>
          <View style={styles.locationTag}>
            <Text style={styles.locationCode}>q1</Text>
            <Text style={styles.locationText}>Focus Grove</Text>
          </View>
          <Text style={styles.networkIcon}>📶</Text>
        </View>

        <View style={styles.currentTaskCard}>
          <Text style={styles.currentTaskLabel}>Current Quest</Text>
          <Text style={styles.currentTaskTitle}>{activeQuest.title}</Text>
        </View>

        <QuestList activeQuestId={activeQuest.id} onSelectQuest={setActiveQuestId} quests={QUESTS} />

        <TreeGrowthCard
          completedSessions={entries.length}
          growthProgress={focusProgress}
          isActive={isFocusRunning}
        />

        {!!historyErrorMessage && <Text style={styles.historyError}>{historyErrorMessage}</Text>}

        <AchievementBadge completedSessions={entries.length} />
        <StickerJournal completedSessions={entries.length} />
      </ScrollView>
    </View>
  );

  const shell = (
    <View style={[styles.shell, isDesktop ? styles.shellDesktop : styles.shellMobile]}>
      {isDesktop ? (
        <>
          {leftPanel}
          {centerPanel}
          {rightPanel}
        </>
      ) : (
        <>
          {centerPanel}
          {leftPanel}
          {rightPanel}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <PixelSceneryBackground />
      <View pointerEvents="none" style={styles.backdropShade} />

      {isDesktop ? (
        <View style={styles.desktopWrap}>{shell}</View>
      ) : (
        <ScrollView contentContainerStyle={styles.mobileScroll}>
          {shell}
        </ScrollView>
      )}

      <Modal
        animationType="fade"
        onRequestClose={dismissCompletionModal}
        transparent
        visible={isCompletionModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modalCopy.title}</Text>
            <Text style={styles.modalBody}>{modalCopy.body}</Text>

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={dismissCompletionModal}
                style={({ pressed }) => [styles.modalSecondaryButton, pressed && styles.modalButtonPressed]}
              >
                <Text style={styles.modalSecondaryButtonText}>Close</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => void handleStartNextSession()}
                style={({ pressed }) => [styles.modalPrimaryButton, pressed && styles.modalButtonPressed]}
              >
                <Text style={styles.modalPrimaryButtonText}>Start Next</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backdropShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 244, 212, 0.05)",
  },
  btnPill: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.textPrimary,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 0,
  },
  btnPillActive: {
    backgroundColor: theme.colors.accentGlow,
  },
  btnPillPressed: {
    opacity: 0.86,
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  btnPillSecondary: {
    minHeight: 50,
  },
  breatherCopy: {
    color: "#6a5037",
    fontFamily: theme.typography.body,
    fontSize: 12,
    letterSpacing: 0.4,
    marginBottom: theme.spacing.md,
    textAlign: "center",
    textTransform: "uppercase",
  },
  btnPillText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  btnPillTextActive: {
    color: theme.colors.textPrimary,
  },
  controlStack: {
    gap: theme.spacing.sm,
    width: "100%",
  },
  centerPanel: {
    alignItems: "center",
    borderLeftColor: "rgba(34, 34, 34, 0.45)",
    borderLeftWidth: 2,
    borderRightColor: "rgba(34, 34, 34, 0.45)",
    borderRightWidth: 2,
    flex: 1,
    justifyContent: "center",
    minHeight: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  centerPanelInner: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  centerPanelMobile: {
    borderBottomWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    paddingVertical: theme.spacing.lg,
    width: "100%",
  },
  currentTaskCard: {
    backgroundColor: "#e6dcb8",
    borderColor: "#222",
    borderRadius: 2,
    borderWidth: 3,
    marginBottom: theme.spacing.lg,
    overflow: "hidden",
    padding: theme.spacing.md,
  },
  currentTaskLabel: {
    color: "#704731",
    fontFamily: theme.typography.heading,
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase",
  },
  currentTaskTitle: {
    color: "#3b2116",
    fontFamily: theme.typography.heading,
    fontSize: 30,
    lineHeight: 34,
  },
  desktopWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.xl,
  },
  errorText: {
    color: "#7f3121",
    fontFamily: theme.typography.body,
    fontSize: 12,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  heartIcon: {
    fontSize: 17,
  },
  historyError: {
    color: "#8d3726",
    fontFamily: theme.typography.body,
    fontSize: 12,
    marginTop: theme.spacing.md,
    textAlign: "right",
  },
  leftPanel: {
    backgroundColor: "rgba(230, 220, 184, 0.84)",
    borderColor: "rgba(34, 34, 34, 0.62)",
    borderRightWidth: 2,
    flexShrink: 0,
    justifyContent: "flex-start",
    minHeight: 0,
    padding: 22,
    width: 250,
  },
  leftPanelHint: {
    color: "#3b2116",
    fontFamily: theme.typography.heading,
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: theme.spacing.md,
    textAlign: "center",
    textTransform: "uppercase",
  },
  leftPanelMobile: {
    borderBottomWidth: 2,
    borderRightWidth: 0,
    width: "100%",
  },
  locationCode: {
    color: "#3b2116",
    fontFamily: theme.typography.heading,
    fontSize: 18,
    marginRight: 6,
    opacity: 0.88,
  },
  locationTag: {
    alignItems: "center",
    flexDirection: "row",
  },
  locationText: {
    color: "#3b2116",
    fontFamily: theme.typography.heading,
    fontSize: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    width: "100%",
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.58)",
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  modalBody: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  modalButtonPressed: {
    opacity: 0.85,
  },
  modalCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.textPrimary,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    maxWidth: 420,
    padding: theme.spacing.lg,
    width: "100%",
  },
  modalPrimaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accentSecondary,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
  },
  modalPrimaryButtonText: {
    color: theme.colors.surface,
    fontFamily: theme.typography.heading,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  modalSecondaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
  },
  modalSecondaryButtonText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading,
    fontSize: 24,
    letterSpacing: 0.6,
  },
  mobileScroll: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  modeTitle: {
    color: "#3b2116",
    fontFamily: theme.typography.heading,
    fontSize: 16,
    letterSpacing: 1,
    marginBottom: theme.spacing.lg,
    textAlign: "center",
    textTransform: "uppercase",
  },
  networkIcon: {
    color: "#3b2116",
    fontSize: 20,
    opacity: 0.62,
  },
  resetButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.textPrimary,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    marginTop: theme.spacing.xs,
    minHeight: 48,
    justifyContent: "center",
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.75,
    shadowRadius: 0,
  },
  resetButtonDisabled: {
    opacity: 0.4,
  },
  resetButtonPressed: {
    opacity: 0.85,
  },
  resetButtonText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  rightContent: {
    flexGrow: 1,
    gap: theme.spacing.sm,
    padding: 22,
    paddingBottom: 30,
  },
  rightPanel: {
    backgroundColor: "rgba(230, 220, 184, 0.48)",
    flexShrink: 0,
    minHeight: 0,
    width: 360,
  },
  rightPanelMobile: {
    minHeight: 0,
    width: "100%",
  },
  root: {
    backgroundColor: "#1b263b",
    flex: 1,
  },
  settingsGrid: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    marginTop: "auto",
    paddingTop: theme.spacing.md,
  },
  shell: {
    backgroundColor: "rgba(230, 220, 184, 0.86)",
    borderColor: "#222",
    borderRadius: 6,
    borderWidth: 3,
    overflow: "hidden",
    shadowColor: "rgba(0,0,0,0.6)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.62,
    shadowRadius: 12,
  },
  shellDesktop: {
    flexDirection: "row",
    maxHeight: 760,
    maxWidth: 1140,
    minHeight: 620,
    width: "88%",
  },
  shellMobile: {
    width: "100%",
  },
  squareButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.textPrimary,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    height: 50,
    justifyContent: "center",
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.75,
    shadowRadius: 0,
    width: 50,
  },
  squareButtonIcon: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  taskHeader: {
    alignItems: "flex-end",
    borderBottomColor: "rgba(59, 33, 22, 0.55)",
    borderBottomWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
    paddingBottom: 10,
  },
  timerDisplay: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
  },
  timerDisplayText: {
    color: "#3b2116",
    fontFamily: theme.typography.heading,
    fontSize: 18,
    letterSpacing: 0.8,
  },
  timerRingWrap: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: theme.radius.lg,
    borderWidth: 0,
    marginBottom: theme.spacing.md,
    padding: 0,
    width: "auto",
  },
  sunIcon: {
    fontSize: 18,
  },
  sunRow: {
    alignItems: "center",
    backgroundColor: "rgba(245, 214, 148, 0.65)",
    borderColor: "rgba(34, 34, 34, 0.55)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: theme.spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sunText: {
    color: "#3b2116",
    fontFamily: theme.typography.heading,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});

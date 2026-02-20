import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CircularTimer } from "../components/CircularTimer";
import { QuestList, type QuestItem } from "../components/QuestList";
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
import { computeRemainingSec } from "../utils/time";
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
  const timerSize = isDesktop ? 248 : Math.max(188, Math.min(width - 90, 236));

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
  const primaryActionText = primaryActionLabel(selectedMode, activeStatus);
  const modeLabel = modeDisplay(selectedMode);
  const completedSessionCount = entries.length;

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

  const panel = (
    <View style={styles.panel}>
      <Text style={styles.modeTitle}>{modeLabel}</Text>
      <Text style={styles.breatherCopy}>Settle in and take a breather.</Text>

      <View style={styles.timerRingWrap}>
        <CircularTimer
          remainingSec={remainingSec}
          size={timerSize}
          totalSec={selectedMode === "focus" ? SESSION_DURATION_SEC : getBreakDuration(selectedMode)}
        />
      </View>

      <Pressable
        accessibilityLabel="Primary timer action"
        accessibilityRole="button"
        onPress={() => void handlePrimaryPress()}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
      >
        <Text style={styles.primaryButtonText}>{primaryActionText}</Text>
      </Pressable>

      <View style={styles.modeRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleModeSelect("focus")}
          style={({ pressed }) => [
            styles.modeChip,
            selectedMode === "focus" && styles.modeChipActive,
            pressed && styles.modeChipPressed,
          ]}
        >
          <Text style={[styles.modeChipText, selectedMode === "focus" && styles.modeChipTextActive]}>Focus</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => void handleModeSelect("short_break")}
          style={({ pressed }) => [
            styles.modeChip,
            selectedMode === "short_break" && styles.modeChipActive,
            pressed && styles.modeChipPressed,
          ]}
        >
          <Text style={[styles.modeChipText, selectedMode === "short_break" && styles.modeChipTextActive]}>
            Short Break
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => void handleModeSelect("long_break")}
          style={({ pressed }) => [
            styles.modeChip,
            selectedMode === "long_break" && styles.modeChipActive,
            pressed && styles.modeChipPressed,
          ]}
        >
          <Text style={[styles.modeChipText, selectedMode === "long_break" && styles.modeChipTextActive]}>
            Long Break
          </Text>
        </Pressable>
      </View>

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

      <View style={styles.questSection}>
        <Text style={styles.sectionLabel}>Current Quest</Text>
        <Text style={styles.currentQuestTitle}>{activeQuest.title}</Text>
        <QuestList activeQuestId={activeQuest.id} onSelectQuest={setActiveQuestId} quests={QUESTS} />
      </View>

      {!!historyErrorMessage && <Text style={styles.errorText}>{historyErrorMessage}</Text>}
      {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      <Text style={styles.sessionText}>
        {completedSessionCount} completed session{completedSessionCount === 1 ? "" : "s"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      {isDesktop ? (
        <View style={styles.desktopWrap}>{panel}</View>
      ) : (
        <ScrollView contentContainerStyle={styles.mobileScroll}>
          {panel}
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
  breatherCopy: {
    color: "#7a6d58",
    fontFamily: theme.typography.body,
    fontSize: 11,
    letterSpacing: 0.4,
    marginBottom: theme.spacing.md,
    textAlign: "center",
    textTransform: "uppercase",
  },
  currentQuestTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading,
    fontSize: 18,
    marginBottom: theme.spacing.sm,
  },
  desktopWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  errorText: {
    color: theme.colors.danger,
    fontFamily: theme.typography.body,
    fontSize: 12,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  mobileScroll: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
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
  modeChip: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 8,
  },
  modeChipActive: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
  },
  modeChipPressed: {
    opacity: 0.82,
  },
  modeChipText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.heading,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  modeChipTextActive: {
    color: theme.colors.textPrimary,
  },
  modeRow: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    width: "100%",
  },
  modeTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading,
    fontSize: 15,
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
    textAlign: "center",
    textTransform: "uppercase",
  },
  panel: {
    backgroundColor: "rgba(250, 245, 235, 0.95)",
    borderColor: "rgba(126, 103, 74, 0.38)",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    maxWidth: 650,
    padding: theme.spacing.lg,
    width: "100%",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accentSecondary,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    minHeight: 46,
    width: "100%",
  },
  primaryButtonPressed: {
    opacity: 0.86,
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontFamily: theme.typography.heading,
    fontSize: 15,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  questSection: {
    marginTop: theme.spacing.sm,
    width: "100%",
  },
  resetButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    minHeight: 40,
    width: "100%",
  },
  resetButtonDisabled: {
    opacity: 0.4,
  },
  resetButtonPressed: {
    opacity: 0.85,
  },
  resetButtonText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.heading,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  root: {
    backgroundColor: "#edf2f5",
    flex: 1,
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.heading,
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  sessionText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.body,
    fontSize: 12,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  timerRingWrap: {
    alignItems: "center",
    marginBottom: theme.spacing.md,
    width: "100%",
  },
});

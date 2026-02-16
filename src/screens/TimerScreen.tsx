import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CircularTimer } from "../components/CircularTimer";
import { timerStore } from "../state/timerStore";
import { historyRepo } from "../storage/historyRepo";
import { SESSION_DURATION_SEC } from "../types/session";
import { theme } from "../theme/tokens";
import type { PersistedRunState } from "../types/session";
import { computeRemainingSec, POMODORO_SECONDS } from "../utils/time";
import { playCompletionChimeAsync } from "../utils/chime";
import { sendCompletionNotificationAsync } from "../utils/notifications";

function statusLabel(status: PersistedRunState["status"]): string {
  if (status === "running") {
    return "Focus in progress";
  }

  if (status === "paused") {
    return "Paused";
  }

  return "Ready";
}

export function TimerScreen() {
  const [runState, setRunState] = useState<PersistedRunState>(timerStore.getIdleState());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const completionLockRef = useRef(false);
  const runStateRef = useRef(runState);

  useEffect(() => {
    runStateRef.current = runState;
  }, [runState]);

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
        void syncFromStorage();
      }
    });

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, [syncFromStorage]);

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
      setErrorMessage(null);
    } catch {
      setErrorMessage("Session finished, but history save failed.");
    } finally {
      try {
        await timerStore.reset();
        await syncFromStorage();
      } catch {
        setRunState(timerStore.getIdleState());
      }
      completionLockRef.current = false;
    }
  }, [syncFromStorage]);

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
      } else if (runState.status === "paused") {
        await timerStore.resume();
      } else {
        await timerStore.start();
      }

      await syncFromStorage();
    } catch {
      setErrorMessage("Could not update timer.");
    }
  }, [runState.status, syncFromStorage]);

  const handleResetPress = useCallback(async () => {
    try {
      await timerStore.reset();
      await syncFromStorage();
      setErrorMessage(null);
    } catch {
      setErrorMessage("Could not reset timer.");
    }
  }, [syncFromStorage]);

  const primaryLabel = runState.status === "running" ? "Pause" : "Start";
  const resetDisabled =
    runState.status === "idle" && runState.remainingSec === POMODORO_SECONDS;
  const subtitle = useMemo(() => statusLabel(runState.status), [runState.status]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.kicker}>Mini Pomodoro</Text>
        <Text style={styles.title}>One focused block at a time.</Text>

        <View style={styles.timerCard}>
          <CircularTimer remainingSec={runState.remainingSec} totalSec={SESSION_DURATION_SEC} />
          <Text style={styles.statusText}>{subtitle}</Text>
        </View>

        <View style={styles.controlsRow}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  controlsRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    width: "100%",
  },
  errorText: {
    color: theme.colors.danger,
    fontFamily: theme.typography.body,
    fontSize: 13,
    textAlign: "center",
  },
  kicker: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body,
    fontSize: 13,
    letterSpacing: 1.2,
    marginTop: theme.spacing.sm,
    textTransform: "uppercase",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    flex: 1,
    minHeight: 54,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontFamily: theme.typography.bodyStrong,
    fontSize: 16,
  },
  root: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 54,
  },
  secondaryButtonDisabled: {
    opacity: 0.55,
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.bodyStrong,
    fontSize: 16,
  },
  secondaryButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
  statusText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body,
    fontSize: 14,
    marginTop: theme.spacing.md,
  },
  timerCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xl,
    width: "100%",
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.heading,
    fontSize: 34,
    lineHeight: 38,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
});

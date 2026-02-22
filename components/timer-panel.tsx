"use client";

/* ─────────────────────────────────────────────────────────
 * TimerPanel — Full focus timer with mode switching,
 *              quest list, and completion modal.
 * ───────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircularTimer } from "./circular-timer";
import { QuestList, type QuestItem } from "./quest-list";
import {
  POMODORO_SECONDS,
  SHORT_BREAK_SECONDS,
  LONG_BREAK_SECONDS,
  computeRemainingSec,
  timerStore,
  historyRepo,
  type PersistedRunState,
  type SessionEntry,
} from "@/lib/timer-store";

type BreakMode = "short_break" | "long_break";
type SessionMode = "focus" | BreakMode;
type BreakRunStatus = "idle" | "running" | "paused";

type BreakRunState = {
  endAtEpochMs: number | null;
  mode: BreakMode;
  remainingSec: number;
  status: BreakRunStatus;
};

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
  return { endAtEpochMs: null, mode, remainingSec: getBreakDuration(mode), status: "idle" };
}

function modeDisplay(mode: SessionMode): string {
  if (mode === "focus") return "Focus Session";
  if (mode === "short_break") return "Short Break";
  return "Long Break";
}

function primaryActionLabel(
  mode: SessionMode,
  status: PersistedRunState["status"] | BreakRunStatus
): string {
  if (status === "running") return "Pause";
  if (status === "paused") return "Resume";
  if (mode === "focus") return "Focus";
  return "Start";
}

export function TimerPanel() {
  const [runState, setRunState] = useState<PersistedRunState>(
    timerStore.getIdleState()
  );
  const [breakState, setBreakState] = useState<BreakRunState>(() =>
    createBreakState("short_break")
  );
  const [selectedMode, setSelectedMode] = useState<SessionMode>("focus");
  const [activeQuestId, setActiveQuestId] = useState<string>(QUESTS[0]!.id);
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCompletionModalVisible, setIsCompletionModalVisible] =
    useState(false);
  const [lastCompletedMode, setLastCompletedMode] =
    useState<SessionMode>("focus");

  const completionLockRef = useRef(false);
  const runStateRef = useRef(runState);

  useEffect(() => {
    runStateRef.current = runState;
  }, [runState]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const hydrated = timerStore.hydrate();
    setRunState(hydrated);
    setEntries(historyRepo.getAll());
    setIsHydrated(true);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setRunState(timerStore.hydrate());
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Tick — focus timer
  useEffect(() => {
    if (runState.status !== "running" || runState.endAtEpochMs === null) return;
    const interval = setInterval(() => {
      setRunState((prev) => {
        if (prev.status !== "running" || prev.endAtEpochMs === null) return prev;
        return { ...prev, remainingSec: computeRemainingSec(prev.endAtEpochMs) };
      });
    }, 250);
    return () => clearInterval(interval);
  }, [runState.endAtEpochMs, runState.status]);

  // Tick — break timer
  useEffect(() => {
    if (breakState.status !== "running" || breakState.endAtEpochMs === null)
      return;
    const interval = setInterval(() => {
      setBreakState((prev) => {
        if (prev.status !== "running" || prev.endAtEpochMs === null) return prev;
        return {
          ...prev,
          remainingSec: Math.max(
            0,
            Math.ceil((prev.endAtEpochMs - Date.now()) / 1000)
          ),
        };
      });
    }, 250);
    return () => clearInterval(interval);
  }, [breakState.endAtEpochMs, breakState.status]);

  const completeFocusSession = useCallback(() => {
    if (completionLockRef.current) return;
    completionLockRef.current = true;

    const active = runStateRef.current;
    const completedAtISO = new Date().toISOString();
    const startedAtISO = active.startedAtISO ?? completedAtISO;

    try {
      // Play chime via Web Audio API
      playChime();

      historyRepo.append({
        id: `${Date.now()}`,
        startedAtISO,
        completedAtISO,
        durationSec: POMODORO_SECONDS,
      });
      setEntries(historyRepo.getAll());
      setErrorMessage(null);

      setActiveQuestId((current) => {
        const idx = QUESTS.findIndex((q) => q.id === current);
        return QUESTS[((idx < 0 ? 0 : idx) + 1) % QUESTS.length]!.id;
      });
    } catch {
      setErrorMessage("Session finished, but history save failed.");
    } finally {
      timerStore.reset();
      setRunState(timerStore.hydrate());
      setLastCompletedMode("focus");
      setIsCompletionModalVisible(true);
      completionLockRef.current = false;
    }
  }, []);

  const completeBreakSession = useCallback(() => {
    if (completionLockRef.current) return;
    completionLockRef.current = true;

    try {
      playChime();
    } catch {
      // ignore
    } finally {
      setBreakState(createBreakState(breakState.mode));
      setLastCompletedMode(breakState.mode);
      setIsCompletionModalVisible(true);
      completionLockRef.current = false;
    }
  }, [breakState.mode]);

  // Completion triggers
  useEffect(() => {
    if (!isHydrated) return;
    if (runState.status === "running" && runState.remainingSec <= 0) {
      completeFocusSession();
    }
  }, [completeFocusSession, isHydrated, runState.remainingSec, runState.status]);

  useEffect(() => {
    if (!isHydrated) return;
    if (breakState.status === "running" && breakState.remainingSec <= 0) {
      completeBreakSession();
    }
  }, [
    breakState.remainingSec,
    breakState.status,
    completeBreakSession,
    isHydrated,
  ]);

  const handleModeSelect = useCallback(
    (nextMode: SessionMode) => {
      if (nextMode === selectedMode) return;
      setErrorMessage(null);
      setIsCompletionModalVisible(false);

      if (runState.status !== "idle") {
        timerStore.reset();
        setRunState(timerStore.hydrate());
      }

      if (nextMode === "focus") {
        setBreakState((prev) => createBreakState(prev.mode));
      } else {
        setBreakState(createBreakState(nextMode));
      }

      setSelectedMode(nextMode);
    },
    [runState.status, selectedMode]
  );

  const handlePrimaryPress = useCallback(() => {
    setErrorMessage(null);

    if (selectedMode === "focus") {
      if (runState.status === "running") {
        timerStore.pause();
      } else if (runState.status === "paused") {
        timerStore.resume();
      } else {
        setIsCompletionModalVisible(false);
        timerStore.start();
      }
      setRunState(timerStore.hydrate());
      return;
    }

    // Break mode
    if (breakState.status === "running") {
      setBreakState((prev) => ({
        ...prev,
        endAtEpochMs: null,
        status: "paused",
      }));
      return;
    }

    if (breakState.status === "paused") {
      const now = Date.now();
      setBreakState((prev) => ({
        ...prev,
        endAtEpochMs: now + prev.remainingSec * 1000,
        status: "running",
      }));
      return;
    }

    const now = Date.now();
    const dur = getBreakDuration(selectedMode as BreakMode);
    setBreakState({
      endAtEpochMs: now + dur * 1000,
      mode: selectedMode as BreakMode,
      remainingSec: dur,
      status: "running",
    });
  }, [breakState.status, runState.status, selectedMode]);

  const handleResetPress = useCallback(() => {
    setErrorMessage(null);
    if (selectedMode === "focus") {
      timerStore.reset();
      setRunState(timerStore.hydrate());
      return;
    }
    setBreakState(createBreakState(selectedMode as BreakMode));
  }, [selectedMode]);

  const handleStartNextSession = useCallback(() => {
    setIsCompletionModalVisible(false);
    setSelectedMode("focus");
    setBreakState((prev) => createBreakState(prev.mode));
    timerStore.start();
    setRunState(timerStore.hydrate());
  }, []);

  const activeStatus =
    selectedMode === "focus" ? runState.status : breakState.status;
  const remainingSec =
    selectedMode === "focus" ? runState.remainingSec : breakState.remainingSec;
  const primaryText = primaryActionLabel(selectedMode, activeStatus);
  const modeLabel = modeDisplay(selectedMode);
  const totalForMode =
    selectedMode === "focus"
      ? POMODORO_SECONDS
      : getBreakDuration(selectedMode as BreakMode);

  const resetDisabled =
    activeStatus === "idle" && remainingSec === totalForMode;

  const activeQuest = useMemo(
    () => QUESTS.find((q) => q.id === activeQuestId) ?? QUESTS[0]!,
    [activeQuestId]
  );

  const modalCopy = useMemo(() => {
    if (lastCompletedMode === "focus")
      return {
        title: "Session complete",
        body: "You wrapped up a full focus block. Take a short break or continue your next quest.",
      };
    if (lastCompletedMode === "short_break")
      return {
        title: "Break finished",
        body: "Short break complete. Jump back into your current quest when ready.",
      };
    return {
      title: "Recovered and ready",
      body: "Long break complete. Your focus streak is ready for another run.",
    };
  }, [lastCompletedMode]);

  const modes: { key: SessionMode; label: string }[] = [
    { key: "focus", label: "Focus" },
    { key: "short_break", label: "Short Break" },
    { key: "long_break", label: "Long Break" },
  ];

  return (
    <>
      <div className="animate-fade-in-up rounded-[10px] border border-border/60 bg-surface/88 p-6 w-full max-w-[650px] backdrop-blur-sm">
        {/* Mode label */}
        <h2 className="text-center text-[15px] uppercase tracking-wider text-foreground mb-1.5">
          {modeLabel}
        </h2>
        <p className="text-center text-[11px] uppercase tracking-[1.2px] text-foreground-muted mb-4">
          Settle in and take a breather.
        </p>

        {/* Timer */}
        <div className="flex justify-center mb-4">
          <CircularTimer
            remainingSec={remainingSec}
            totalSec={totalForMode}
          />
        </div>

        {/* Primary action */}
        <button
          onClick={handlePrimaryPress}
          className="w-full min-h-[46px] rounded-md border border-accent-secondary bg-accent text-background font-mono text-[15px] uppercase tracking-wider transition-opacity hover:opacity-90 active:opacity-80 mb-4"
        >
          {primaryText}
        </button>

        {/* Mode chips */}
        <div className="flex gap-1.5 mb-2.5">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => handleModeSelect(m.key)}
              className={`flex-1 min-h-[42px] rounded-full border font-mono text-[13px] tracking-wider transition-all ${
                selectedMode === m.key
                  ? "border-accent bg-accent/12 text-accent"
                  : "border-border-subtle bg-transparent text-foreground-secondary hover:border-border-highlight"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Reset */}
        <button
          onClick={handleResetPress}
          disabled={resetDisabled}
          className={`w-full min-h-[40px] rounded-md border border-border bg-transparent font-mono text-[13px] uppercase tracking-wider text-foreground-secondary transition-opacity mb-4 ${
            resetDisabled
              ? "opacity-40 cursor-not-allowed"
              : "hover:opacity-85 active:opacity-75"
          }`}
        >
          Reset
        </button>

        {/* Quest section */}
        <div className="w-full">
          <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-1">
            Current Quest
          </p>
          <p className="text-[18px] text-foreground font-mono mb-2.5">
            {activeQuest.title}
          </p>
          <QuestList
            activeQuestId={activeQuest.id}
            onSelectQuest={setActiveQuestId}
            quests={QUESTS}
          />
        </div>

        {/* Errors + session count */}
        {errorMessage && (
          <p className="text-center text-[12px] text-danger mt-2.5">
            {errorMessage}
          </p>
        )}
        <p className="text-center text-[12px] text-foreground-muted mt-4">
          {entries.length} completed session{entries.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Completion modal */}
      {isCompletionModalVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/58 p-6"
          onClick={() => setIsCompletionModalVisible(false)}
        >
          <div
            className="animate-fade-in-up w-full max-w-[420px] rounded-[10px] border border-border bg-surface p-6 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[24px] tracking-wider text-foreground font-mono">
              {modalCopy.title}
            </h3>
            <p className="text-[14px] leading-relaxed text-foreground-secondary mt-2.5 text-center">
              {modalCopy.body}
            </p>
            <div className="flex gap-2.5 mt-6 w-full">
              <button
                onClick={() => setIsCompletionModalVisible(false)}
                className="flex-1 min-h-[46px] rounded-md border border-border bg-surface-muted font-mono text-[13px] uppercase tracking-wider text-foreground hover:opacity-85"
              >
                Close
              </button>
              <button
                onClick={handleStartNextSession}
                className="flex-1 min-h-[46px] rounded-md border border-accent-secondary bg-accent font-mono text-[13px] uppercase tracking-wider text-background hover:opacity-90"
              >
                Start Next
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Web Audio chime ────────────────────────────────────── */
function playChime() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.0001;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.36);

    setTimeout(() => ctx.close(), 500);
  } catch {
    // Audio failures are non-blocking
  }
}

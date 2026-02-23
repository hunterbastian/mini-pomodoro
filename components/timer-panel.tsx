"use client";

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
  if (mode === "focus") return "focus session";
  if (mode === "short_break") return "short break";
  return "long break";
}

function primaryActionLabel(
  mode: SessionMode,
  status: PersistedRunState["status"] | BreakRunStatus,
): string {
  if (status === "running") return "Pause";
  if (status === "paused") return "Resume";
  if (mode === "focus") return "Start Focus";
  return "Start Break";
}

export function TimerPanel() {
  const [runState, setRunState] = useState<PersistedRunState>(timerStore.getIdleState());
  const [breakState, setBreakState] = useState<BreakRunState>(() => createBreakState("short_break"));
  const [selectedMode, setSelectedMode] = useState<SessionMode>("focus");
  const [activeQuestId, setActiveQuestId] = useState<string>(QUESTS[0]!.id);
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCompletionModalVisible, setIsCompletionModalVisible] = useState(false);
  const [lastCompletedMode, setLastCompletedMode] = useState<SessionMode>("focus");

  const completionLockRef = useRef(false);
  const runStateRef = useRef(runState);
  useEffect(() => { runStateRef.current = runState; }, [runState]);

  // Hydrate
  useEffect(() => {
    const hydrated = timerStore.hydrate();
    setRunState(hydrated);
    setEntries(historyRepo.getAll());
    setIsHydrated(true);
    const onVis = () => {
      if (document.visibilityState === "visible") setRunState(timerStore.hydrate());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Tick focus
  useEffect(() => {
    if (runState.status !== "running" || runState.endAtEpochMs === null) return;
    const id = setInterval(() => {
      setRunState((prev) => {
        if (prev.status !== "running" || prev.endAtEpochMs === null) return prev;
        return { ...prev, remainingSec: computeRemainingSec(prev.endAtEpochMs) };
      });
    }, 250);
    return () => clearInterval(id);
  }, [runState.endAtEpochMs, runState.status]);

  // Tick break
  useEffect(() => {
    if (breakState.status !== "running" || breakState.endAtEpochMs === null) return;
    const id = setInterval(() => {
      setBreakState((prev) => {
        if (prev.status !== "running" || prev.endAtEpochMs === null) return prev;
        return { ...prev, remainingSec: Math.max(0, Math.ceil((prev.endAtEpochMs - Date.now()) / 1000)) };
      });
    }, 250);
    return () => clearInterval(id);
  }, [breakState.endAtEpochMs, breakState.status]);

  const completeFocusSession = useCallback(() => {
    if (completionLockRef.current) return;
    completionLockRef.current = true;
    const active = runStateRef.current;
    const completedAtISO = new Date().toISOString();
    const startedAtISO = active.startedAtISO ?? completedAtISO;
    try {
      playChime();
      historyRepo.append({ id: `${Date.now()}`, startedAtISO, completedAtISO, durationSec: POMODORO_SECONDS });
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
    try { playChime(); } catch { /* ignore */ }
    setBreakState(createBreakState(breakState.mode));
    setLastCompletedMode(breakState.mode);
    setIsCompletionModalVisible(true);
    completionLockRef.current = false;
  }, [breakState.mode]);

  useEffect(() => {
    if (!isHydrated) return;
    if (runState.status === "running" && runState.remainingSec <= 0) completeFocusSession();
  }, [completeFocusSession, isHydrated, runState.remainingSec, runState.status]);

  useEffect(() => {
    if (!isHydrated) return;
    if (breakState.status === "running" && breakState.remainingSec <= 0) completeBreakSession();
  }, [breakState.remainingSec, breakState.status, completeBreakSession, isHydrated]);

  const handleModeSelect = useCallback((nextMode: SessionMode) => {
    if (nextMode === selectedMode) return;
    setErrorMessage(null);
    setIsCompletionModalVisible(false);
    if (runState.status !== "idle") { timerStore.reset(); setRunState(timerStore.hydrate()); }
    if (nextMode === "focus") setBreakState((prev) => createBreakState(prev.mode));
    else setBreakState(createBreakState(nextMode));
    setSelectedMode(nextMode);
  }, [runState.status, selectedMode]);

  const handlePrimaryPress = useCallback(() => {
    setErrorMessage(null);
    if (selectedMode === "focus") {
      if (runState.status === "running") timerStore.pause();
      else if (runState.status === "paused") timerStore.resume();
      else { setIsCompletionModalVisible(false); timerStore.start(); }
      setRunState(timerStore.hydrate());
      return;
    }
    if (breakState.status === "running") {
      setBreakState((prev) => ({ ...prev, endAtEpochMs: null, status: "paused" }));
      return;
    }
    if (breakState.status === "paused") {
      const now = Date.now();
      setBreakState((prev) => ({ ...prev, endAtEpochMs: now + prev.remainingSec * 1000, status: "running" }));
      return;
    }
    const now = Date.now();
    const dur = getBreakDuration(selectedMode as BreakMode);
    setBreakState({ endAtEpochMs: now + dur * 1000, mode: selectedMode as BreakMode, remainingSec: dur, status: "running" });
  }, [breakState.status, runState.status, selectedMode]);

  const handleResetPress = useCallback(() => {
    setErrorMessage(null);
    if (selectedMode === "focus") { timerStore.reset(); setRunState(timerStore.hydrate()); return; }
    setBreakState(createBreakState(selectedMode as BreakMode));
  }, [selectedMode]);

  const handleStartNextSession = useCallback(() => {
    setIsCompletionModalVisible(false);
    setSelectedMode("focus");
    setBreakState((prev) => createBreakState(prev.mode));
    timerStore.start();
    setRunState(timerStore.hydrate());
  }, []);

  const activeStatus = selectedMode === "focus" ? runState.status : breakState.status;
  const remainingSec = selectedMode === "focus" ? runState.remainingSec : breakState.remainingSec;
  const primaryText = primaryActionLabel(selectedMode, activeStatus);
  const totalForMode = selectedMode === "focus" ? POMODORO_SECONDS : getBreakDuration(selectedMode as BreakMode);
  const resetDisabled = activeStatus === "idle" && remainingSec === totalForMode;
  const activeQuest = useMemo(() => QUESTS.find((q) => q.id === activeQuestId) ?? QUESTS[0]!, [activeQuestId]);
  const isRunning = activeStatus === "running";

  const modalCopy = useMemo(() => {
    if (lastCompletedMode === "focus") return { title: "Session Complete", body: "Full focus block wrapped. Take a short break or start your next quest." };
    if (lastCompletedMode === "short_break") return { title: "Break Finished", body: "Short break over. Jump back when ready." };
    return { title: "Recovered", body: "Long break done. Focus streak is primed." };
  }, [lastCompletedMode]);

  const modes: { key: SessionMode; label: string }[] = [
    { key: "focus", label: "Focus" },
    { key: "short_break", label: "Short" },
    { key: "long_break", label: "Long" },
  ];

  return (
    <>
      <div className="animate-fade-in-up flex flex-col items-center w-full max-w-[480px]">
        {/* Mode selector — pill row */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-surface/60 backdrop-blur-md p-1 mb-8">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => handleModeSelect(m.key)}
              className={`rounded-full px-5 py-2 font-mono text-[11px] uppercase tracking-[0.15em] transition-all duration-200 ${
                selectedMode === m.key
                  ? "bg-accent text-background shadow-sm"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Timer ring */}
        <div className="mb-8">
          <CircularTimer
            remainingSec={remainingSec}
            totalSec={totalForMode}
            size={280}
            modeLabel={modeDisplay(selectedMode)}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 w-full max-w-[320px] mb-3">
          <button
            onClick={handlePrimaryPress}
            className={`flex-1 h-12 rounded-full font-mono text-[13px] uppercase tracking-[0.15em] transition-all duration-200 ${
              isRunning
                ? "bg-surface-elevated border border-border text-foreground hover:bg-surface-muted"
                : "bg-accent border border-accent-secondary text-background hover:brightness-110"
            }`}
          >
            {primaryText}
          </button>
          <button
            onClick={handleResetPress}
            disabled={resetDisabled}
            className={`h-12 w-12 rounded-full border border-border bg-surface flex items-center justify-center transition-all duration-200 ${
              resetDisabled ? "opacity-30 cursor-not-allowed" : "hover:bg-surface-muted"
            }`}
            aria-label="Reset timer"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-foreground-secondary">
              <path d="M2.5 2.5V6H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2.78 9.5a5.5 5.5 0 1 0 .72-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Session count */}
        <p className="text-[11px] tracking-[0.15em] text-foreground-muted mb-8">
          {entries.length} session{entries.length === 1 ? "" : "s"} completed
        </p>

        {/* Quest section */}
        <div className="w-full rounded-2xl border border-border bg-surface/50 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-foreground-muted">
              Current Quest
            </span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-accent">
              {activeQuest.title}
            </span>
          </div>
          <QuestList activeQuestId={activeQuest.id} onSelectQuest={setActiveQuestId} quests={QUESTS} />
        </div>

        {errorMessage && (
          <p className="text-center text-[12px] text-danger mt-4">{errorMessage}</p>
        )}
      </div>

      {/* Completion modal */}
      {isCompletionModalVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          onClick={() => setIsCompletionModalVisible(false)}
        >
          <div
            className="animate-fade-in-up w-full max-w-[380px] rounded-2xl border border-border bg-surface p-8 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success ring icon */}
            <div className="w-16 h-16 rounded-full border-2 border-accent flex items-center justify-center mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#c8935a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-[20px] tracking-wider text-foreground font-mono">
              {modalCopy.title}
            </h3>
            <p className="text-[13px] leading-relaxed text-foreground-secondary mt-2 text-center max-w-[280px]">
              {modalCopy.body}
            </p>
            <div className="flex gap-3 mt-7 w-full">
              <button
                onClick={() => setIsCompletionModalVisible(false)}
                className="flex-1 h-11 rounded-full border border-border bg-surface-muted font-mono text-[12px] uppercase tracking-[0.12em] text-foreground hover:bg-surface-elevated transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleStartNextSession}
                className="flex-1 h-11 rounded-full border border-accent-secondary bg-accent font-mono text-[12px] uppercase tracking-[0.12em] text-background hover:brightness-110 transition-all"
              >
                Next Session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function playChime() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  } catch { /* non-blocking */ }
}

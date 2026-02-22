/* ─────────────────────────────────────────────────────────
 * Timer Store — localStorage-backed state machine
 *
 * States: idle → running ↔ paused → idle
 * Uses epoch timestamps so the timer survives tab-switches.
 * ───────────────────────────────────────────────────────── */

export const POMODORO_SECONDS = 1500; // 25 minutes
export const SHORT_BREAK_SECONDS = 300; // 5 minutes
export const LONG_BREAK_SECONDS = 900; // 15 minutes

export type RunStatus = "idle" | "running" | "paused";

export type PersistedRunState = {
  status: RunStatus;
  startedAtISO: string | null;
  endAtEpochMs: number | null;
  remainingSec: number;
};

export type SessionEntry = {
  id: string;
  startedAtISO: string;
  completedAtISO: string;
  durationSec: number;
};

const RUN_STATE_KEY = "pomodoro.runState.v1";
const HISTORY_KEY = "pomodoro.history.v1";

function clampRemainingSec(value: number): number {
  if (!Number.isFinite(value)) return POMODORO_SECONDS;
  return Math.min(POMODORO_SECONDS, Math.max(0, Math.round(value)));
}

export function computeRemainingSec(
  endAtEpochMs: number,
  nowEpochMs = Date.now()
): number {
  const delta = Math.ceil((endAtEpochMs - nowEpochMs) / 1000);
  return clampRemainingSec(delta);
}

export function formatSeconds(value: number): string {
  const sec = clampRemainingSec(value);
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function createIdleState(): PersistedRunState {
  return {
    status: "idle",
    startedAtISO: null,
    endAtEpochMs: null,
    remainingSec: POMODORO_SECONDS,
  };
}

function readState(): PersistedRunState {
  if (typeof window === "undefined") return createIdleState();
  try {
    const raw = localStorage.getItem(RUN_STATE_KEY);
    if (!raw) return createIdleState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return createIdleState();
    const status =
      parsed.status === "running" || parsed.status === "paused"
        ? parsed.status
        : "idle";
    if (status === "idle") return createIdleState();
    return {
      status,
      startedAtISO:
        typeof parsed.startedAtISO === "string" ? parsed.startedAtISO : null,
      endAtEpochMs:
        typeof parsed.endAtEpochMs === "number" ? parsed.endAtEpochMs : null,
      remainingSec: clampRemainingSec(
        typeof parsed.remainingSec === "number"
          ? parsed.remainingSec
          : POMODORO_SECONDS
      ),
    };
  } catch {
    return createIdleState();
  }
}

function writeState(state: PersistedRunState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RUN_STATE_KEY, JSON.stringify(state));
}

export const timerStore = {
  getIdleState: createIdleState,

  hydrate(): PersistedRunState {
    const current = readState();
    if (current.status === "running" && current.endAtEpochMs !== null) {
      const next = {
        ...current,
        remainingSec: computeRemainingSec(current.endAtEpochMs),
      };
      writeState(next);
      return next;
    }
    return current;
  },

  start(): void {
    const now = Date.now();
    writeState({
      status: "running",
      startedAtISO: new Date(now).toISOString(),
      endAtEpochMs: now + POMODORO_SECONDS * 1000,
      remainingSec: POMODORO_SECONDS,
    });
  },

  pause(): void {
    const current = readState();
    if (current.status !== "running" || current.endAtEpochMs === null) return;
    writeState({
      status: "paused",
      startedAtISO: current.startedAtISO,
      endAtEpochMs: null,
      remainingSec: computeRemainingSec(current.endAtEpochMs),
    });
  },

  resume(): void {
    const current = readState();
    if (current.status !== "paused") return;
    if (current.remainingSec <= 0) {
      timerStore.reset();
      return;
    }
    const now = Date.now();
    writeState({
      status: "running",
      startedAtISO:
        current.startedAtISO ?? new Date(now).toISOString(),
      endAtEpochMs: now + clampRemainingSec(current.remainingSec) * 1000,
      remainingSec: clampRemainingSec(current.remainingSec),
    });
  },

  reset(): void {
    writeState(createIdleState());
  },
};

/* ─── History ─────────────────────────────────────────────── */

export const historyRepo = {
  getAll(): SessionEntry[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (e: unknown) =>
            e &&
            typeof e === "object" &&
            typeof (e as SessionEntry).id === "string" &&
            typeof (e as SessionEntry).startedAtISO === "string" &&
            typeof (e as SessionEntry).completedAtISO === "string"
        )
        .sort(
          (a: SessionEntry, b: SessionEntry) =>
            Date.parse(b.completedAtISO) - Date.parse(a.completedAtISO)
        );
    } catch {
      return [];
    }
  },

  append(entry: SessionEntry): void {
    const current = historyRepo.getAll();
    const next = [entry, ...current].sort(
      (a, b) =>
        Date.parse(b.completedAtISO) - Date.parse(a.completedAtISO)
    );
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  },
};

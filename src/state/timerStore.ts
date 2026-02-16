import AsyncStorage from "@react-native-async-storage/async-storage";

import { RUN_STATE_KEY } from "../storage/keys";
import type { PersistedRunState, RunStatus } from "../types/session";
import { POMODORO_SECONDS, clampRemainingSec, computeRemainingSec } from "../utils/time";

function createIdleState(): PersistedRunState {
  return {
    status: "idle",
    startedAtISO: null,
    endAtEpochMs: null,
    remainingSec: POMODORO_SECONDS,
  };
}

function isRunStatus(value: unknown): value is RunStatus {
  return value === "idle" || value === "running" || value === "paused";
}

function sanitizeState(value: unknown): PersistedRunState {
  if (!value || typeof value !== "object") {
    return createIdleState();
  }

  const candidate = value as PersistedRunState;
  const status = isRunStatus(candidate.status) ? candidate.status : "idle";
  const startedAtISO = typeof candidate.startedAtISO === "string" ? candidate.startedAtISO : null;
  const endAtEpochMs =
    typeof candidate.endAtEpochMs === "number" && Number.isFinite(candidate.endAtEpochMs)
      ? candidate.endAtEpochMs
      : null;
  const remainingSec = clampRemainingSec(
    typeof candidate.remainingSec === "number" ? candidate.remainingSec : POMODORO_SECONDS,
  );

  if (status === "idle") {
    return createIdleState();
  }

  if (status === "running" && endAtEpochMs === null) {
    return {
      status: "paused",
      startedAtISO,
      endAtEpochMs: null,
      remainingSec,
    };
  }

  return {
    status,
    startedAtISO,
    endAtEpochMs,
    remainingSec,
  };
}

async function readRunState(): Promise<PersistedRunState> {
  const serialized = await AsyncStorage.getItem(RUN_STATE_KEY);

  if (!serialized) {
    return createIdleState();
  }

  try {
    return sanitizeState(JSON.parse(serialized));
  } catch {
    return createIdleState();
  }
}

async function writeRunState(state: PersistedRunState): Promise<void> {
  await AsyncStorage.setItem(RUN_STATE_KEY, JSON.stringify(state));
}

async function hydrate(): Promise<PersistedRunState> {
  const current = await readRunState();

  if (current.status !== "running" || current.endAtEpochMs === null) {
    if (current.status === "paused") {
      const normalizedPaused = {
        ...current,
        remainingSec: clampRemainingSec(current.remainingSec),
      };
      await writeRunState(normalizedPaused);
      return normalizedPaused;
    }

    return current;
  }

  const next = {
    ...current,
    remainingSec: computeRemainingSec(current.endAtEpochMs),
  };

  await writeRunState(next);
  return next;
}

async function start(): Promise<void> {
  const nowMs = Date.now();

  await writeRunState({
    status: "running",
    startedAtISO: new Date(nowMs).toISOString(),
    endAtEpochMs: nowMs + POMODORO_SECONDS * 1000,
    remainingSec: POMODORO_SECONDS,
  });
}

async function pause(): Promise<void> {
  const current = await hydrate();

  if (current.status !== "running" || current.endAtEpochMs === null) {
    return;
  }

  await writeRunState({
    status: "paused",
    startedAtISO: current.startedAtISO,
    endAtEpochMs: null,
    remainingSec: computeRemainingSec(current.endAtEpochMs),
  });
}

async function resume(): Promise<void> {
  const current = await hydrate();

  if (current.status !== "paused") {
    return;
  }

  if (current.remainingSec <= 0) {
    await reset();
    return;
  }

  const nowMs = Date.now();

  await writeRunState({
    status: "running",
    startedAtISO: current.startedAtISO ?? new Date(nowMs).toISOString(),
    endAtEpochMs: nowMs + clampRemainingSec(current.remainingSec) * 1000,
    remainingSec: clampRemainingSec(current.remainingSec),
  });
}

async function reset(): Promise<void> {
  await writeRunState(createIdleState());
}

export const timerStore = {
  getIdleState: createIdleState,
  hydrate,
  start,
  pause,
  resume,
  reset,
};

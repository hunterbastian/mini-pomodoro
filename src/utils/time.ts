import { SESSION_DURATION_SEC } from "../types/session";

export const POMODORO_SECONDS = SESSION_DURATION_SEC;

export function clampRemainingSec(value: number): number {
  if (!Number.isFinite(value)) {
    return POMODORO_SECONDS;
  }

  return Math.min(POMODORO_SECONDS, Math.max(0, Math.round(value)));
}

export function computeRemainingSec(endAtEpochMs: number, nowEpochMs = Date.now()): number {
  const delta = Math.ceil((endAtEpochMs - nowEpochMs) / 1000);
  return clampRemainingSec(delta);
}

export function formatSeconds(value: number): string {
  const remainingSec = clampRemainingSec(value);
  const minutes = Math.floor(remainingSec / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (remainingSec % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

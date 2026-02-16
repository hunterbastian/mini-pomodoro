export const SESSION_DURATION_SEC = 1500 as const;

export type SessionEntry = {
  id: string;
  startedAtISO: string;
  completedAtISO: string;
  durationSec: typeof SESSION_DURATION_SEC;
};

export type RunStatus = "idle" | "running" | "paused";

export type PersistedRunState = {
  status: RunStatus;
  startedAtISO: string | null;
  endAtEpochMs: number | null;
  remainingSec: number;
};

import AsyncStorage from "@react-native-async-storage/async-storage";

import { HISTORY_KEY } from "./keys";
import { SESSION_DURATION_SEC, type SessionEntry } from "../types/session";

function isSessionEntry(value: unknown): value is SessionEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as SessionEntry;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.startedAtISO === "string" &&
    typeof candidate.completedAtISO === "string" &&
    candidate.durationSec === SESSION_DURATION_SEC
  );
}

function normalizeHistory(value: unknown): SessionEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isSessionEntry)
    .sort((a, b) => Date.parse(b.completedAtISO) - Date.parse(a.completedAtISO));
}

async function readHistory(): Promise<SessionEntry[]> {
  const serialized = await AsyncStorage.getItem(HISTORY_KEY);

  if (!serialized) {
    return [];
  }

  try {
    return normalizeHistory(JSON.parse(serialized));
  } catch {
    return [];
  }
}

export const historyRepo = {
  async getAll(): Promise<SessionEntry[]> {
    return readHistory();
  },

  async append(entry: SessionEntry): Promise<void> {
    const current = await readHistory();
    const next = [entry, ...current].sort(
      (a, b) => Date.parse(b.completedAtISO) - Date.parse(a.completedAtISO),
    );

    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  },
};

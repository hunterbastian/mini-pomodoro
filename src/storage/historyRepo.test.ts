import { historyRepo } from "./historyRepo";
import { HISTORY_KEY } from "./keys";
import { SESSION_DURATION_SEC } from "../types/session";

jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockAsyncStorage = require("@react-native-async-storage/async-storage/jest/async-storage-mock");

describe("historyRepo", () => {
  beforeEach(async () => {
    await mockAsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("stores entries newest-first", async () => {
    await historyRepo.append({
      id: "first",
      startedAtISO: "2026-02-16T10:00:00.000Z",
      completedAtISO: "2026-02-16T10:25:00.000Z",
      durationSec: SESSION_DURATION_SEC,
    });

    await historyRepo.append({
      id: "second",
      startedAtISO: "2026-02-16T11:00:00.000Z",
      completedAtISO: "2026-02-16T11:25:00.000Z",
      durationSec: SESSION_DURATION_SEC,
    });

    const entries = await historyRepo.getAll();

    expect(entries).toHaveLength(2);
    expect(entries[0]?.id).toBe("second");
    expect(entries[1]?.id).toBe("first");
  });

  it("recovers gracefully from corrupted storage JSON", async () => {
    await mockAsyncStorage.setItem(HISTORY_KEY, "not json");

    const entries = await historyRepo.getAll();

    expect(entries).toEqual([]);
  });
});

import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { TimerScreen } from "./TimerScreen";
import { timerStore } from "../state/timerStore";

jest.mock("../components/CircularTimer", () => ({
  CircularTimer: () => null,
}));

jest.mock("../storage/historyRepo", () => ({
  historyRepo: {
    append: jest.fn(),
  },
}));

jest.mock("../utils/chime", () => ({
  playCompletionChimeAsync: jest.fn(async () => undefined),
}));

jest.mock("../utils/notifications", () => ({
  sendCompletionNotificationAsync: jest.fn(async () => undefined),
}));

jest.mock("../state/timerStore", () => ({
  timerStore: {
    getIdleState: jest.fn(() => ({
      status: "idle",
      startedAtISO: null,
      endAtEpochMs: null,
      remainingSec: 1500,
    })),
    hydrate: jest.fn(),
    start: jest.fn(async () => undefined),
    pause: jest.fn(async () => undefined),
    resume: jest.fn(async () => undefined),
    reset: jest.fn(async () => undefined),
  },
}));

describe("TimerScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("supports Start, Pause, and Reset transitions", async () => {
    const mockHydrate = timerStore.hydrate as jest.Mock;

    mockHydrate
      .mockResolvedValueOnce({
        status: "idle",
        startedAtISO: null,
        endAtEpochMs: null,
        remainingSec: 1500,
      })
      .mockResolvedValueOnce({
        status: "running",
        startedAtISO: "2026-02-16T10:00:00.000Z",
        endAtEpochMs: Date.now() + 1500 * 1000,
        remainingSec: 1500,
      })
      .mockResolvedValueOnce({
        status: "paused",
        startedAtISO: "2026-02-16T10:00:00.000Z",
        endAtEpochMs: null,
        remainingSec: 1498,
      })
      .mockResolvedValueOnce({
        status: "idle",
        startedAtISO: null,
        endAtEpochMs: null,
        remainingSec: 1500,
      });

    const screen = render(<TimerScreen />);

    await waitFor(() => {
      expect(timerStore.hydrate).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(screen.getByText("Start"));

    await waitFor(() => {
      expect(timerStore.start).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Pause")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Pause"));

    await waitFor(() => {
      expect(timerStore.pause).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Start")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Reset"));

    await waitFor(() => {
      expect(timerStore.reset).toHaveBeenCalledTimes(1);
    });
  });
});

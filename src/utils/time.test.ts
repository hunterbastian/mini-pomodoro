import {
  POMODORO_SECONDS,
  clampRemainingSec,
  computeRemainingSec,
  formatSeconds,
} from "./time";

describe("time utils", () => {
  it("clamps values to the [0, 1500] bounds", () => {
    expect(clampRemainingSec(-1)).toBe(0);
    expect(clampRemainingSec(1800)).toBe(POMODORO_SECONDS);
    expect(clampRemainingSec(360)).toBe(360);
  });

  it("computes remaining seconds from timestamps", () => {
    const now = 1_700_000_000_000;

    expect(computeRemainingSec(now + 5000, now)).toBe(5);
    expect(computeRemainingSec(now - 5000, now)).toBe(0);
  });

  it("formats seconds as mm:ss", () => {
    expect(formatSeconds(0)).toBe("00:00");
    expect(formatSeconds(65)).toBe("01:05");
    expect(formatSeconds(POMODORO_SECONDS)).toBe("25:00");
  });
});

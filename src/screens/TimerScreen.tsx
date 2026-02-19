/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — TimerScreen
 *
 * Read top-to-bottom. Each `at` is ms after mount / trigger.
 *
 * MOUNT ENTRANCE
 *    0ms   dither banner slides up from +16, fades in
 *  120ms   kicker label fades in
 *  200ms   energy bar dots cascade in (staggered 28ms each)
 *  360ms   timer card scales 0.93 → 1.0, fades in
 *  480ms   control buttons slide up from +8, fade in
 *  560ms   history section fades in
 *
 * RUNNING STATE (looping)
 *  continuous   energy dots pulse opacity 1.0 ↔ 0.5 (1100ms/cycle)
 *  continuous   hero card border breathes via glow anim (2200ms/cycle)
 *  continuous   timer ring progress drains with each tick
 *
 * MODAL ENTRANCE (on session complete)
 *    0ms   backdrop fades in
 *   60ms   card springs up from scale 0.88, +20 translateY → 0
 *  180ms   kicker fades in
 *  280ms   "+25 XP" counter animates scale 0.7 → 1.05 → 1.0
 *  400ms   body text fades in
 *  500ms   buttons slide up, staggered 80ms
 * ───────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CircularTimer } from "../components/CircularTimer";
import { DitherArt } from "../components/DitherArt";
import { PixelFlower } from "../components/PixelFlower";
import { timerStore } from "../state/timerStore";
import { historyRepo } from "../storage/historyRepo";
import { SESSION_DURATION_SEC, type SessionEntry } from "../types/session";
import { theme } from "../theme/tokens";
import type { PersistedRunState } from "../types/session";
import { computeRemainingSec, POMODORO_SECONDS } from "../utils/time";
import { playCompletionChimeAsync } from "../utils/chime";
import { sendCompletionNotificationAsync } from "../utils/notifications";
import { logAnalyticsEvent } from "../utils/analytics";

/* ─── Timing constants ──────────────────────────────────── */
const TIMING = {
  bannerIn:     0,    // dither banner fades + slides up
  kickerIn:     120,  // kicker label appears
  dotsIn:       200,  // energy dots start staggering
  timerCardIn:  360,  // timer card scales in
  controlsIn:   480,  // buttons slide up
  historyIn:    560,  // history section fades in

  // Modal stages (ms after modal becomes visible)
  modalCard:    60,   // card springs up
  modalKicker:  180,  // kicker text fades
  modalXP:      280,  // +XP badge bounces
  modalBody:    400,  // body text fades
  modalButtons: 500,  // buttons stagger in
};

/* ─── Element config objects ────────────────────────────── */
const BANNER = {
  offsetY:  16,    // px slides up from
  duration: 400,   // ms
  easing:   Easing.out(Easing.cubic),
};

const TIMER_CARD = {
  initialScale: 0.93,  // scale before appearing
  finalScale:   1.0,
  offsetY:      10,    // px slides up from
  duration:     420,
  easing:       Easing.out(Easing.cubic),
};

const CONTROLS = {
  offsetY:  8,     // px slides up from
  duration: 350,
  easing:   Easing.out(Easing.cubic),
};

const DOTS = {
  count:   20,          // total energy bar dots
  stagger: 28,          // ms between each dot appearing
  duration: 220,        // fade-in duration per dot
};

const PULSE = {
  minOpacity: 0.5,      // dim end of pulse cycle
  halfCycle:  1100,     // ms per half-cycle
  easing:     Easing.inOut(Easing.sin),
};

const GLOW_BREATHE = {
  halfCycle:   2200,    // ms per half-cycle
  easing:      Easing.inOut(Easing.sin),
};

const MODAL_CARD = {
  initialScale:  0.88,
  initialOffsetY: 20,
  springStiffness: 320,
  springDamping:   26,
  duration:      300,
  easing:        Easing.out(Easing.back(1.4)),
};

const MODAL_XP = {
  overshootScale: 1.08,   // bounce overshoot
  finalScale:     1.0,
  duration1:      180,    // scale up duration
  duration2:      120,    // settle duration
  easing1:        Easing.out(Easing.cubic),
  easing2:        Easing.inOut(Easing.quad),
};

/* ─── Breakpoints ───────────────────────────────────────── */
const BREAKPOINT = {
  tablet:  768,
  desktop: 1024,
  narrow:  430,
};

const MAX_WIDTH = {
  tablet:       650,
  desktop:      720,
  desktopShell: 1180,
};

/* ─── Helpers ───────────────────────────────────────────── */
function statusLabel(status: PersistedRunState["status"]): string {
  if (status === "running") return "CASTING";
  if (status === "paused")  return "PAUSED";
  return "IDLE";
}

function formatDate(valueISO: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  }).format(new Date(valueISO));
}

function formatTime(valueISO: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour:   "numeric",
    minute: "2-digit",
  }).format(new Date(valueISO));
}

/* ─── Component ─────────────────────────────────────────── */
export function TimerScreen() {
  const [runState, setRunState]                       = useState<PersistedRunState>(timerStore.getIdleState());
  const [entries, setEntries]                         = useState<SessionEntry[]>([]);
  const [errorMessage, setErrorMessage]               = useState<string | null>(null);
  const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated]                   = useState(false);
  const [isCompletionModalVisible, setIsCompletionModalVisible] = useState(false);
  const [mountStage, setMountStage]                   = useState(0);
  const [modalStage, setModalStage]                   = useState(0);

  const { width } = useWindowDimensions();
  const isDesktop = width >= BREAKPOINT.desktop;
  const isTablet  = width >= BREAKPOINT.tablet && width < BREAKPOINT.desktop;
  const isNarrow  = width < BREAKPOINT.narrow;

  const horizontalInset     = isDesktop ? 48 : isTablet ? theme.spacing.lg : theme.spacing.md;
  const stackedContentWidth = Math.max(280, Math.min(width - horizontalInset * 2, isTablet ? MAX_WIDTH.tablet : MAX_WIDTH.desktop));
  // Desktop: constrain shell to 1280px max, centered
  const desktopShellWidth   = Math.min(width - horizontalInset * 2, MAX_WIDTH.desktopShell);
  // Hero takes 58% of shell; history gets the rest
  const desktopHeroWidth    = Math.floor(desktopShellWidth * 0.58);
  const desktopHistoryWidth = desktopShellWidth - desktopHeroWidth - theme.spacing.xl;
  const timerSize = Math.max(220, Math.min(
    (isDesktop ? desktopHeroWidth : stackedContentWidth) - 80,
    isDesktop ? 360 : isTablet ? 280 : 250,
  ));

  const useNativeDriver = Platform.OS !== "web";

  /* ─── Refs ─────────────────────────────────────── */
  const completionLockRef = useRef(false);
  const runStateRef       = useRef(runState);
  const mountTimers       = useRef<ReturnType<typeof setTimeout>[]>([]);
  const modalTimers       = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* ─── Animated values ──────────────────────────── */
  // Mount entrance
  const bannerOpacity   = useRef(new Animated.Value(0)).current;
  const bannerTranslate = useRef(new Animated.Value(BANNER.offsetY)).current;
  const kickerOpacity   = useRef(new Animated.Value(0)).current;
  const timerCardOpacity   = useRef(new Animated.Value(0)).current;
  const timerCardScale     = useRef(new Animated.Value(TIMER_CARD.initialScale)).current;
  const timerCardTranslate = useRef(new Animated.Value(TIMER_CARD.offsetY)).current;
  const controlsOpacity    = useRef(new Animated.Value(0)).current;
  const controlsTranslate  = useRef(new Animated.Value(CONTROLS.offsetY)).current;
  const historyOpacity     = useRef(new Animated.Value(0)).current;

  // Per-dot animated values (stable array across renders)
  const dotAnims = useRef(
    Array.from({ length: DOTS.count }, () => new Animated.Value(0))
  ).current;

  // Running-state loops
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  // Modal entrance
  const modalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const modalCardScale       = useRef(new Animated.Value(MODAL_CARD.initialScale)).current;
  const modalCardTranslate   = useRef(new Animated.Value(MODAL_CARD.initialOffsetY)).current;
  const modalCardOpacity     = useRef(new Animated.Value(0)).current;
  const modalKickerOpacity   = useRef(new Animated.Value(0)).current;
  const modalXPScale         = useRef(new Animated.Value(0.7)).current;
  const modalXPOpacity       = useRef(new Animated.Value(0)).current;
  const modalBodyOpacity     = useRef(new Animated.Value(0)).current;
  const modalBtn1Opacity     = useRef(new Animated.Value(0)).current;
  const modalBtn1Translate   = useRef(new Animated.Value(8)).current;
  const modalBtn2Opacity     = useRef(new Animated.Value(0)).current;
  const modalBtn2Translate   = useRef(new Animated.Value(8)).current;

  /* ─── Mount entrance storyboard ────────────────── */
  useEffect(() => {
    const t = mountTimers.current;
    const anim = (v: Animated.Value, toValue: number, duration: number, delay = 0, easing = Easing.out(Easing.cubic)) =>
      Animated.timing(v, { toValue, duration, delay, easing, useNativeDriver });

    // Stage 1 — banner slides up
    t.push(setTimeout(() => {
      Animated.parallel([
        anim(bannerOpacity,   1, BANNER.duration, 0, BANNER.easing),
        anim(bannerTranslate, 0, BANNER.duration, 0, BANNER.easing),
      ]).start();
    }, TIMING.bannerIn));

    // Stage 2 — kicker fades in
    t.push(setTimeout(() => {
      anim(kickerOpacity, 1, 280).start();
    }, TIMING.kickerIn));

    // Stage 3 — energy dots stagger in
    t.push(setTimeout(() => {
      dotAnims.forEach((dot, i) => {
        Animated.timing(dot, {
          toValue:      1,
          duration:     DOTS.duration,
          delay:        i * DOTS.stagger,
          easing:       Easing.out(Easing.cubic),
          useNativeDriver,
        }).start();
      });
    }, TIMING.dotsIn));

    // Stage 4 — timer card scales in
    t.push(setTimeout(() => {
      Animated.parallel([
        anim(timerCardOpacity,   1, TIMER_CARD.duration, 0, TIMER_CARD.easing),
        anim(timerCardScale,     TIMER_CARD.finalScale, TIMER_CARD.duration, 0, TIMER_CARD.easing),
        anim(timerCardTranslate, 0, TIMER_CARD.duration, 0, TIMER_CARD.easing),
      ]).start();
    }, TIMING.timerCardIn));

    // Stage 5 — controls slide up
    t.push(setTimeout(() => {
      Animated.parallel([
        anim(controlsOpacity,   1, CONTROLS.duration, 0, CONTROLS.easing),
        anim(controlsTranslate, 0, CONTROLS.duration, 0, CONTROLS.easing),
      ]).start();
    }, TIMING.controlsIn));

    // Stage 6 — history section fades
    t.push(setTimeout(() => {
      Animated.timing(historyOpacity, {
        toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver,
      }).start();
    }, TIMING.historyIn));

    return () => t.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Running-state loop animations ────────────── */
  useEffect(() => {
    if (runState.status !== "running") {
      pulseAnim.stopAnimation(); pulseAnim.setValue(1);
      glowAnim.stopAnimation();  glowAnim.setValue(0);
      return;
    }

    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: PULSE.minOpacity, duration: PULSE.halfCycle, easing: PULSE.easing, useNativeDriver }),
      Animated.timing(pulseAnim, { toValue: 1,                duration: PULSE.halfCycle, easing: PULSE.easing, useNativeDriver }),
    ]));
    pulse.start();

    const breathe = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: GLOW_BREATHE.halfCycle, easing: GLOW_BREATHE.easing, useNativeDriver }),
      Animated.timing(glowAnim, { toValue: 0, duration: GLOW_BREATHE.halfCycle, easing: GLOW_BREATHE.easing, useNativeDriver }),
    ]));
    breathe.start();

    return () => { pulse.stop(); breathe.stop(); pulseAnim.setValue(1); glowAnim.setValue(0); };
  }, [glowAnim, pulseAnim, runState.status, useNativeDriver]);

  /* ─── Modal entrance storyboard ────────────────── */
  useEffect(() => {
    const t = modalTimers.current;
    t.forEach(clearTimeout);
    modalTimers.current = [];

    if (!isCompletionModalVisible) {
      // Reset all modal values
      [modalBackdropOpacity, modalCardOpacity, modalKickerOpacity,
       modalXPOpacity, modalBodyOpacity, modalBtn1Opacity, modalBtn2Opacity].forEach(v => v.setValue(0));
      modalCardScale.setValue(MODAL_CARD.initialScale);
      modalCardTranslate.setValue(MODAL_CARD.initialOffsetY);
      modalXPScale.setValue(0.7);
      modalBtn1Translate.setValue(8);
      modalBtn2Translate.setValue(8);
      setModalStage(0);
      return;
    }

    const anim = (v: Animated.Value, toValue: number, duration: number, delay = 0, easing = Easing.out(Easing.cubic)) =>
      Animated.timing(v, { toValue, duration, delay, easing, useNativeDriver });

    // Backdrop immediately
    anim(modalBackdropOpacity, 1, 200).start();

    // Card springs in
    t.push(setTimeout(() => {
      setModalStage(1);
      Animated.parallel([
        anim(modalCardOpacity,   1, 200, 0, Easing.out(Easing.cubic)),
        anim(modalCardScale,     1, MODAL_CARD.duration, 0, MODAL_CARD.easing),
        anim(modalCardTranslate, 0, MODAL_CARD.duration, 0, MODAL_CARD.easing),
      ]).start();
    }, TIMING.modalCard));

    // Kicker fades
    t.push(setTimeout(() => {
      setModalStage(2);
      anim(modalKickerOpacity, 1, 220).start();
    }, TIMING.modalKicker));

    // XP bounces in
    t.push(setTimeout(() => {
      setModalStage(3);
      Animated.parallel([
        anim(modalXPOpacity, 1, 180),
        Animated.sequence([
          anim(modalXPScale, MODAL_XP.overshootScale, MODAL_XP.duration1, 0, MODAL_XP.easing1),
          anim(modalXPScale, MODAL_XP.finalScale,     MODAL_XP.duration2, 0, MODAL_XP.easing2),
        ]),
      ]).start();
    }, TIMING.modalXP));

    // Body fades
    t.push(setTimeout(() => {
      setModalStage(4);
      anim(modalBodyOpacity, 1, 240).start();
    }, TIMING.modalBody));

    // Buttons stagger up
    t.push(setTimeout(() => {
      setModalStage(5);
      Animated.parallel([
        anim(modalBtn1Opacity,   1, 240, 0,  Easing.out(Easing.cubic)),
        anim(modalBtn1Translate, 0, 240, 0,  Easing.out(Easing.cubic)),
        anim(modalBtn2Opacity,   1, 240, 80, Easing.out(Easing.cubic)),
        anim(modalBtn2Translate, 0, 240, 80, Easing.out(Easing.cubic)),
      ]).start();
    }, TIMING.modalButtons));

    return () => { t.forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompletionModalVisible]);

  /* ─── Timer & state logic (unchanged) ──────────── */
  useEffect(() => { void logAnalyticsEvent("mini_pomodoro_opened"); }, []);
  useEffect(() => { runStateRef.current = runState; }, [runState]);

  const loadHistory = useCallback(async () => {
    try {
      const nextEntries = await historyRepo.getAll();
      setEntries(nextEntries);
      setHistoryErrorMessage(null);
      await logAnalyticsEvent("pomodoro_history_loaded", { entry_count: nextEntries.length });
    } catch {
      setHistoryErrorMessage("Could not load history.");
      await logAnalyticsEvent("pomodoro_history_load_failed");
    }
  }, []);

  const syncFromStorage = useCallback(async () => {
    const hydrated = await timerStore.hydrate();
    setRunState(hydrated);
    return hydrated;
  }, []);

  useEffect(() => {
    let isActive = true;
    const hydrateOnMount = async () => {
      try {
        const hydrated = await timerStore.hydrate();
        if (isActive) { setRunState(hydrated); setErrorMessage(null); }
      } catch {
        if (isActive) setErrorMessage("Could not load timer state.");
      } finally {
        if (isActive) setIsHydrated(true);
      }
    };
    void hydrateOnMount();
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") { void logAnalyticsEvent("mini_pomodoro_foregrounded"); void syncFromStorage(); }
    });
    return () => { isActive = false; sub.remove(); };
  }, [syncFromStorage]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (runState.status !== "running" || runState.endAtEpochMs === null) return;
    const interval = setInterval(() => {
      setRunState(prev => {
        if (prev.status !== "running" || prev.endAtEpochMs === null) return prev;
        return { ...prev, remainingSec: computeRemainingSec(prev.endAtEpochMs) };
      });
    }, 250);
    return () => clearInterval(interval);
  }, [runState.status, runState.endAtEpochMs]);

  const completeSession = useCallback(async () => {
    if (completionLockRef.current) return;
    completionLockRef.current = true;
    const active = runStateRef.current;
    const completedAtISO = new Date().toISOString();
    const startedAtISO   = active.startedAtISO ?? completedAtISO;
    try {
      await sendCompletionNotificationAsync();
      await playCompletionChimeAsync();
      await historyRepo.append({ id: `${Date.now()}`, startedAtISO, completedAtISO, durationSec: SESSION_DURATION_SEC });
      await logAnalyticsEvent("pomodoro_completed", { duration_sec: SESSION_DURATION_SEC });
      setErrorMessage(null);
      await loadHistory();
    } catch {
      setErrorMessage("Session finished, but history save failed.");
    } finally {
      try { await timerStore.reset(); await syncFromStorage(); }
      catch { setRunState(timerStore.getIdleState()); }
      setIsCompletionModalVisible(true);
      completionLockRef.current = false;
    }
  }, [loadHistory, syncFromStorage]);

  useEffect(() => {
    if (!isHydrated) return;
    if (runState.status === "running" && runState.remainingSec <= 0) void completeSession();
  }, [completeSession, isHydrated, runState.remainingSec, runState.status]);

  const handlePrimaryPress = useCallback(async () => {
    try {
      setErrorMessage(null);
      if (runState.status === "running") {
        await timerStore.pause();
        await logAnalyticsEvent("pomodoro_paused", { remaining_sec: runState.remainingSec });
      } else if (runState.status === "paused") {
        await timerStore.resume();
        await logAnalyticsEvent("pomodoro_resumed", { remaining_sec: runState.remainingSec });
      } else {
        setIsCompletionModalVisible(false);
        await timerStore.start();
        await logAnalyticsEvent("pomodoro_started", { duration_sec: SESSION_DURATION_SEC });
      }
      await syncFromStorage();
    } catch { setErrorMessage("Could not update timer."); }
  }, [runState.remainingSec, runState.status, syncFromStorage]);

  const handleResetPress = useCallback(async () => {
    try {
      await timerStore.reset();
      await logAnalyticsEvent("pomodoro_reset", { remaining_sec: runState.remainingSec });
      await syncFromStorage();
      setErrorMessage(null);
    } catch { setErrorMessage("Could not reset timer."); }
  }, [runState.remainingSec, syncFromStorage]);

  const dismissCompletionModal   = useCallback(() => setIsCompletionModalVisible(false), []);

  const handleStartNextSession = useCallback(async () => {
    try {
      setIsCompletionModalVisible(false);
      setErrorMessage(null);
      await timerStore.start();
      await logAnalyticsEvent("pomodoro_started_from_modal", { duration_sec: SESSION_DURATION_SEC });
      await syncFromStorage();
    } catch { setErrorMessage("Could not start next session."); }
  }, [syncFromStorage]);

  /* ─── Derived values ────────────────────────────── */
  const primaryLabel  = runState.status === "running" ? "[ PAUSE ]" : "[ FOCUS ]";
  const resetDisabled = runState.status === "idle" && runState.remainingSec === POMODORO_SECONDS;
  const subtitle      = useMemo(() => statusLabel(runState.status), [runState.status]);

  const activeDots       = Math.max(1, Math.ceil((runState.remainingSec / SESSION_DURATION_SEC) * DOTS.count));
  const activeDotMotion  = runState.status === "running" ? { opacity: pulseAnim } : null;

  const glowBorderColor = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [theme.colors.border, theme.colors.accentGlow],
  });

  const heroWidth    = isDesktop ? desktopHeroWidth    : stackedContentWidth;
  const historyWidth = isDesktop ? desktopHistoryWidth : stackedContentWidth;
  const modalWidth   = Math.min(isDesktop ? desktopHistoryWidth : stackedContentWidth, 400);
  const ditherWidth  = Math.min(heroWidth - 0, 400);  // full-bleed banner

  /* ─── Hero card ─────────────────────────────────── */
  const heroCard = (
    <Animated.View
      style={[
        styles.heroSection,
        isDesktop && styles.heroSectionDesktop,
        { borderColor: runState.status === "running" ? glowBorderColor : theme.colors.border },
      ]}
    >
      {/* Banner: slides up on mount */}
      <Animated.View
        style={[
          styles.ditherBanner,
          { opacity: bannerOpacity, transform: [{ translateY: bannerTranslate }] },
        ]}
      >
        <DitherArt width={ditherWidth} />
        <View style={styles.ditherScrim} />
      </Animated.View>

      {/* Kicker */}
      <Animated.Text style={[styles.kicker, { opacity: kickerOpacity }]}>
        ⚔  MINI POMODORO  ⚔
      </Animated.Text>

      {/* Energy bar */}
      <View style={styles.energyBarRow}>
        {dotAnims.map((dotAnim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.energyDot,
              i < activeDots ? styles.energyDotActive : styles.energyDotInactive,
              { opacity: dotAnim },  // entrance fade
              i < activeDots && activeDotMotion,  // running pulse overlays entrance
            ]}
          />
        ))}
      </View>
      <Animated.Text style={[styles.energyLabel, { opacity: kickerOpacity }]}>
        ENERGY
      </Animated.Text>

      {/* Timer card: scales in */}
      <Animated.View
        style={[
          styles.timerCard,
          {
            opacity:   timerCardOpacity,
            transform: [
              { scale:      timerCardScale     },
              { translateY: timerCardTranslate },
            ],
          },
        ]}
      >
        <CircularTimer
          remainingSec={runState.remainingSec}
          size={timerSize}
          totalSec={SESSION_DURATION_SEC}
        />
        <Text style={styles.statusText}>{subtitle}</Text>
      </Animated.View>

      {/* Controls: slide up */}
      <Animated.View
        style={[
          styles.controlsRow,
          isNarrow && styles.controlsRowStacked,
          { opacity: controlsOpacity, transform: [{ translateY: controlsTranslate }] },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={handlePrimaryPress}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={resetDisabled}
          onPress={handleResetPress}
          style={({ pressed }) => [
            styles.secondaryButton,
            resetDisabled && styles.secondaryButtonDisabled,
            pressed && !resetDisabled && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.secondaryButtonText, resetDisabled && styles.secondaryButtonTextDisabled]}>
            [ RESET ]
          </Text>
        </Pressable>
      </Animated.View>

      {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
    </Animated.View>
  );

  /* ─── Render ────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.root}>
      {/* Background: ambient glows */}
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={[styles.backgroundGlow, styles.backgroundGlowTop]} />
        <View style={[styles.backgroundGlow, styles.backgroundGlowBottom]} />
      </View>

      {isDesktop ? (
        <View style={[styles.desktopShell, { paddingHorizontal: horizontalInset, paddingTop: theme.spacing.lg }]}>
          <View style={[styles.desktopGrid, { width: desktopShellWidth }]}>
            <View style={{ width: heroWidth, alignSelf: "stretch" }}>{heroCard}</View>

            <View style={[styles.desktopHistoryPanel, { width: historyWidth }]}>
              <Animated.View style={[styles.historyHeaderDesktop, { opacity: historyOpacity }]}>
                <View style={styles.historyTitleRow}>
                  <View>
                    <Text style={styles.historyTitle}>▓ SESSION LOG</Text>
                    <Text style={styles.historySubtitle}>COMPLETED 25-MIN BLOCKS</Text>
                  </View>
                  <PixelFlower sessionCount={entries.length} size={52} />
                </View>
                {!!historyErrorMessage && <Text style={styles.errorText}>{historyErrorMessage}</Text>}
              </Animated.View>

              <FlatList
                contentContainerStyle={styles.desktopHistoryListContent}
                data={entries}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <View style={[styles.emptyWrap, styles.emptyWrapDesktop]}>
                    <PixelFlower sessionCount={0} size={88} />
                    <Text style={styles.emptyTitle}>// NO SESSIONS YET</Text>
                    <Text style={styles.emptySubtitle}>Complete a focus block to begin.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={[styles.row, styles.rowFullWidth]}>
                    <View style={styles.rowIconRow}>
                      <View style={styles.rowGem} />
                      <Text style={styles.rowDate}>{formatDate(item.completedAtISO)}</Text>
                    </View>
                    <Text style={styles.rowMeta}>started {formatTime(item.startedAtISO)}</Text>
                  </View>
                )}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalInset, paddingTop: theme.spacing.md }]}
          data={entries}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={{ width: stackedContentWidth }}>
              {heroCard}
              <Animated.View style={[styles.historyHeader, { opacity: historyOpacity }]}>
                <View style={styles.historyTitleRow}>
                  <View>
                    <Text style={styles.historyTitle}>▓ SESSION LOG</Text>
                    <Text style={styles.historySubtitle}>COMPLETED 25-MIN BLOCKS</Text>
                  </View>
                  <PixelFlower sessionCount={entries.length} size={52} />
                </View>
                {!!historyErrorMessage && <Text style={styles.errorText}>{historyErrorMessage}</Text>}
              </Animated.View>
            </View>
          }
          ListEmptyComponent={
            <View style={[styles.emptyWrap, { width: stackedContentWidth }]}>
              <PixelFlower sessionCount={0} size={88} />
              <Text style={styles.emptyTitle}>// NO SESSIONS YET</Text>
              <Text style={styles.emptySubtitle}>Complete a focus block to begin.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.row, { width: stackedContentWidth }]}>
              <View style={styles.rowIconRow}>
                <View style={styles.rowGem} />
                <Text style={styles.rowDate}>{formatDate(item.completedAtISO)}</Text>
              </View>
              <Text style={styles.rowMeta}>started {formatTime(item.startedAtISO)}</Text>
            </View>
          )}
        />
      )}

      {/* ─── Completion modal ─── */}
      <Modal animationType="none" onRequestClose={dismissCompletionModal} transparent visible={isCompletionModalVisible}>
        <Animated.View style={[styles.modalBackdrop, { opacity: modalBackdropOpacity }]}>
          <Animated.View
            style={[
              styles.modalCard,
              {
                opacity:   modalCardOpacity,
                transform: [{ scale: modalCardScale }, { translateY: modalCardTranslate }],
                width:     modalWidth,
              },
            ]}
          >
            {/* Dither banner full-bleed */}
            <View style={styles.modalDitherBanner}>
              <DitherArt width={modalWidth} />
              <View style={styles.modalDitherScrim} />
            </View>

            {/* Kicker */}
            <Animated.Text style={[styles.modalKicker, { opacity: modalKickerOpacity }]}>
              ✦ QUEST COMPLETE ✦
            </Animated.Text>

            {/* XP badge — bounces in */}
            <Animated.Text
              style={[
                styles.modalTitle,
                { opacity: modalXPOpacity, transform: [{ scale: modalXPScale }] },
              ]}
            >
              +25 XP
            </Animated.Text>

            {/* Body */}
            <Animated.Text style={[styles.modalBody, { opacity: modalBodyOpacity }]}>
              Focus block complete. Rest briefly or begin the next enchantment.
            </Animated.Text>

            {/* Buttons stagger up */}
            <View style={[styles.modalActions, isNarrow && styles.modalActionsStacked]}>
              <Animated.View
                style={[
                  styles.modalButtonWrap,
                  { opacity: modalBtn1Opacity, transform: [{ translateY: modalBtn1Translate }] },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={dismissCompletionModal}
                  style={({ pressed }) => [styles.modalSecondaryButton, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.modalSecondaryButtonText}>[ REST ]</Text>
                </Pressable>
              </Animated.View>

              <Animated.View
                style={[
                  styles.modalButtonWrap,
                  { opacity: modalBtn2Opacity, transform: [{ translateY: modalBtn2Translate }] },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={handleStartNextSession}
                  style={({ pressed }) => [styles.modalPrimaryButton, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.modalPrimaryButtonText}>[ NEXT QUEST ]</Text>
                </Pressable>
              </Animated.View>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

/* ─── Styles ────────────────────────────────────────────── */
const styles = StyleSheet.create({
  backgroundGlow: {
    borderRadius: 160,
    opacity: 0.55,
    position: "absolute",
  },
  backgroundGlowBottom: {
    backgroundColor: theme.colors.glowB,
    height: 360,
    right: -140,
    top: "55%",
    width: 360,
  },
  backgroundGlowTop: {
    backgroundColor: theme.colors.glowA,
    height: 400,
    left: -160,
    top: -120,
    width: 400,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  buttonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.968 }],
  },
  controlsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    width: "100%",
  },
  controlsRowStacked: {
    flexDirection: "column",
  },
  desktopGrid: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: theme.spacing.xl,
  },
  desktopHistoryListContent: {
    paddingBottom: theme.spacing.sm,
  },
  desktopHistoryPanel: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    shadowColor: theme.colors.glowA,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  desktopShell: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-start",
  },
  ditherBanner: {
    marginBottom: 0,
    overflow: "hidden",
    width: "100%",
  },
  ditherScrim: {
    ...StyleSheet.absoluteFillObject,
    // Gradient scrim: dark at bottom to blend into card surface
    backgroundColor: "transparent",
    // On native, use a bottom-aligned gradient-like fade
    bottom: 0,
    height: 32,
    position: "absolute",
    left: 0,
    right: 0,
    // Gradient simulation: apply in parent with bottom border
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.mono,
    fontSize: 12,
    letterSpacing: 0.8,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  emptyTitle: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 15,
    letterSpacing: 1.2,
    textAlign: "center",
  },
  emptyWrap: {
    alignItems: "center",
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyWrapDesktop: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  energyBarRow: {
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    marginBottom: 4,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  energyDot: {
    borderRadius: 2,
    flex: 1,
    height: 5,
    maxWidth: 22,
  },
  energyDotActive: {
    backgroundColor: theme.colors.accent,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  energyDotInactive: {
    backgroundColor: theme.colors.surfaceMuted,
    opacity: 0.4,
  },
  energyLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.mono,
    fontSize: 9,
    letterSpacing: 3,
    marginBottom: theme.spacing.sm,
    marginTop: 4,
    textAlign: "center",
  },
  errorText: {
    color: theme.colors.danger,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  heroSection: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
    overflow: "hidden",
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 0,
    shadowColor: theme.colors.glowA,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
  },
  heroSectionDesktop: {
    flex: 1,
    marginBottom: 0,
  },
  historyHeader: {
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  historyTitleRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyHeaderDesktop: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  historySubtitle: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.mono,
    fontSize: 10,
    letterSpacing: 1.8,
    marginTop: 4,
  },
  historyTitle: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 13,
    letterSpacing: 2.5,
  },
  kicker: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  listContent: {
    alignItems: "center",
    paddingBottom: theme.spacing.xl,
  },
  modalActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    width: "100%",
  },
  modalActionsStacked: {
    flexDirection: "column-reverse",
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: theme.colors.overlay,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  modalBody: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 12,
    letterSpacing: 0.6,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  modalButtonWrap: {
    flex: 1,
  },
  modalCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accentSecondary,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 0,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
  },
  modalDitherBanner: {
    overflow: "hidden",
    width: "100%",
  },
  modalDitherScrim: {
    ...StyleSheet.absoluteFillObject,
    bottom: 0,
    height: 28,
    left: 0,
    position: "absolute",
    right: 0,
  },
  modalKicker: {
    color: theme.colors.accentGlow,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    letterSpacing: 2.5,
    marginTop: theme.spacing.md,
  },
  modalPrimaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
  },
  modalPrimaryButtonText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.mono,
    fontSize: 12,
    letterSpacing: 2,
  },
  modalSecondaryButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: theme.colors.borderHighlight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  modalSecondaryButtonText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 12,
    letterSpacing: 2,
  },
  modalTitle: {
    color: theme.colors.accentGlow,
    fontFamily: theme.typography.mono,
    fontSize: 40,
    letterSpacing: 4,
    marginTop: theme.spacing.xs,
    textAlign: "center",
    textShadowColor: theme.colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
  },
  primaryButtonText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.mono,
    fontSize: 14,
    letterSpacing: 2.5,
  },
  root: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  row: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  rowDate: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.mono,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  rowFullWidth: {
    width: "100%",
  },
  rowGem: {
    backgroundColor: theme.colors.accent,
    borderRadius: 1,
    height: 7,
    marginRight: 9,
    marginTop: 1,
    opacity: 0.85,
    width: 7,
  },
  rowIconRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  rowMeta: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 4,
    paddingLeft: 16,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: theme.colors.borderHighlight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  secondaryButtonDisabled: {
    opacity: 0.28,
  },
  secondaryButtonText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.mono,
    fontSize: 14,
    letterSpacing: 2.5,
  },
  secondaryButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  statusText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.mono,
    fontSize: 10,
    letterSpacing: 4,
    marginTop: theme.spacing.md,
    textTransform: "uppercase",
  },
  timerCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    width: "100%",
  },
});

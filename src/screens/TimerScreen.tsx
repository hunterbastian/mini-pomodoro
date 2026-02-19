/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — TimerScreen (cozy edition)
 *
 * MOUNT ENTRANCE
 *    0ms   header label fades up from +10
 *  100ms   timer card scales 0.94 → 1.0, fades in
 *  300ms   control buttons fade + slide up from +8
 *  420ms   session log section fades in
 *
 * RUNNING STATE (looping)
 *  continuous   hero card border softly breathes (2400ms/cycle)
 *  continuous   timer ring progress drains per tick
 *
 * MODAL ENTRANCE (on session complete)
 *    0ms   backdrop fades in
 *   80ms   card rises: scale 0.90 → 1.0, +18 → 0
 *  200ms   title fades in
 *  320ms   body text fades in
 *  420ms   buttons stagger in
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
  headerIn:   0,
  timerIn:    100,
  controlsIn: 300,
  historyIn:  420,

  modalCard:    80,
  modalTitle:   200,
  modalBody:    320,
  modalButtons: 420,
};

/* ─── Element configs ───────────────────────────────────── */
const HEADER = {
  offsetY:  10,
  duration: 380,
  easing:   Easing.out(Easing.cubic),
};

const TIMER_CARD = {
  initialScale: 0.94,
  finalScale:   1.0,
  offsetY:      12,
  duration:     440,
  easing:       Easing.out(Easing.cubic),
};

const CONTROLS = {
  offsetY:  8,
  duration: 320,
  easing:   Easing.out(Easing.cubic),
};

const GLOW_BREATHE = {
  halfCycle: 2400,
  easing:    Easing.inOut(Easing.sin),
};

const MODAL_CARD = {
  initialScale:   0.90,
  initialOffsetY: 18,
  duration:       340,
  easing:         Easing.out(Easing.back(1.2)),
};

/* ─── Breakpoints ───────────────────────────────────────── */
const BREAKPOINT = { tablet: 768, desktop: 1024, narrow: 430 };
const MAX_WIDTH  = { tablet: 600, desktop: 680, desktopShell: 1120 };

/* ─── Helpers ───────────────────────────────────────────── */
function statusLabel(s: PersistedRunState["status"]): string {
  if (s === "running") return "Farming";
  if (s === "paused")  return "Resting";
  return "New day ready";
}

function primaryLabel(s: PersistedRunState["status"]): string {
  if (s === "running") return "Pause day";
  if (s === "paused")  return "Back to farm";
  return "Start day";
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

/* ─── Component ─────────────────────────────────────────── */
export function TimerScreen() {
  const [runState, setRunState]       = useState<PersistedRunState>(timerStore.getIdleState());
  const [entries, setEntries]         = useState<SessionEntry[]>([]);
  const [errorMessage, setErrorMessage]               = useState<string | null>(null);
  const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated]   = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { width } = useWindowDimensions();
  const isDesktop = width >= BREAKPOINT.desktop;
  const isTablet  = width >= BREAKPOINT.tablet && width < BREAKPOINT.desktop;
  const isNarrow  = width < BREAKPOINT.narrow;

  const horizontalInset     = isDesktop ? 48 : isTablet ? theme.spacing.lg : theme.spacing.md;
  const stackedContentWidth = Math.max(280, Math.min(width - horizontalInset * 2, isTablet ? MAX_WIDTH.tablet : MAX_WIDTH.desktop));
  const desktopShellWidth   = Math.min(width - horizontalInset * 2, MAX_WIDTH.desktopShell);
  const desktopHeroWidth    = Math.floor(desktopShellWidth * 0.57);
  const desktopHistoryWidth = desktopShellWidth - desktopHeroWidth - theme.spacing.xl;
  const timerSize = Math.max(220, Math.min(
    (isDesktop ? desktopHeroWidth : stackedContentWidth) - 72,
    isDesktop ? 340 : isTablet ? 280 : 260,
  ));

  const useNativeDriver = Platform.OS !== "web";

  /* ─── Refs ─────────────────────────────────────────────── */
  const completionLockRef = useRef(false);
  const runStateRef       = useRef(runState);
  const mountTimers       = useRef<ReturnType<typeof setTimeout>[]>([]);
  const modalTimers       = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* ─── Animated values ───────────────────────────────────── */
  const headerOpacity    = useRef(new Animated.Value(0)).current;
  const headerTranslate  = useRef(new Animated.Value(HEADER.offsetY)).current;
  const timerCardOpacity = useRef(new Animated.Value(0)).current;
  const timerCardScale   = useRef(new Animated.Value(TIMER_CARD.initialScale)).current;
  const timerCardTranslate = useRef(new Animated.Value(TIMER_CARD.offsetY)).current;
  const controlsOpacity  = useRef(new Animated.Value(0)).current;
  const controlsTranslate = useRef(new Animated.Value(CONTROLS.offsetY)).current;
  const historyOpacity   = useRef(new Animated.Value(0)).current;
  const glowAnim         = useRef(new Animated.Value(0)).current;

  // Modal
  const modalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const modalCardOpacity     = useRef(new Animated.Value(0)).current;
  const modalCardScale       = useRef(new Animated.Value(MODAL_CARD.initialScale)).current;
  const modalCardTranslate   = useRef(new Animated.Value(MODAL_CARD.initialOffsetY)).current;
  const modalTitleOpacity    = useRef(new Animated.Value(0)).current;
  const modalBodyOpacity     = useRef(new Animated.Value(0)).current;
  const modalBtn1Opacity     = useRef(new Animated.Value(0)).current;
  const modalBtn1Translate   = useRef(new Animated.Value(8)).current;
  const modalBtn2Opacity     = useRef(new Animated.Value(0)).current;
  const modalBtn2Translate   = useRef(new Animated.Value(8)).current;

  /* ─── Mount entrance ────────────────────────────────────── */
  useEffect(() => {
    const t = mountTimers.current;
    const anim = (v: Animated.Value, to: number, dur: number, delay = 0, ease = Easing.out(Easing.cubic)) =>
      Animated.timing(v, { toValue: to, duration: dur, delay, easing: ease, useNativeDriver });

    t.push(setTimeout(() => {
      Animated.parallel([
        anim(headerOpacity,   1, HEADER.duration,      0, HEADER.easing),
        anim(headerTranslate, 0, HEADER.duration,      0, HEADER.easing),
      ]).start();
    }, TIMING.headerIn));

    t.push(setTimeout(() => {
      Animated.parallel([
        anim(timerCardOpacity,   1,                   TIMER_CARD.duration, 0, TIMER_CARD.easing),
        anim(timerCardScale,     TIMER_CARD.finalScale, TIMER_CARD.duration, 0, TIMER_CARD.easing),
        anim(timerCardTranslate, 0,                   TIMER_CARD.duration, 0, TIMER_CARD.easing),
      ]).start();
    }, TIMING.timerIn));

    t.push(setTimeout(() => {
      Animated.parallel([
        anim(controlsOpacity,   1, CONTROLS.duration, 0, CONTROLS.easing),
        anim(controlsTranslate, 0, CONTROLS.duration, 0, CONTROLS.easing),
      ]).start();
    }, TIMING.controlsIn));

    t.push(setTimeout(() => {
      anim(historyOpacity, 1, 320).start();
    }, TIMING.historyIn));

    return () => t.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Glow breathe (running state only) ────────────────── */
  useEffect(() => {
    if (runState.status !== "running") {
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
      return;
    }
    const breathe = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: GLOW_BREATHE.halfCycle, easing: GLOW_BREATHE.easing, useNativeDriver }),
      Animated.timing(glowAnim, { toValue: 0, duration: GLOW_BREATHE.halfCycle, easing: GLOW_BREATHE.easing, useNativeDriver }),
    ]));
    breathe.start();
    return () => { breathe.stop(); glowAnim.setValue(0); };
  }, [glowAnim, runState.status, useNativeDriver]);

  /* ─── Modal entrance ────────────────────────────────────── */
  useEffect(() => {
    const t = modalTimers.current;
    t.forEach(clearTimeout);
    modalTimers.current = [];

    if (!isModalVisible) {
      [modalBackdropOpacity, modalCardOpacity, modalTitleOpacity,
       modalBodyOpacity, modalBtn1Opacity, modalBtn2Opacity].forEach(v => v.setValue(0));
      modalCardScale.setValue(MODAL_CARD.initialScale);
      modalCardTranslate.setValue(MODAL_CARD.initialOffsetY);
      modalBtn1Translate.setValue(8);
      modalBtn2Translate.setValue(8);
      return;
    }

    const anim = (v: Animated.Value, to: number, dur: number, delay = 0, ease = Easing.out(Easing.cubic)) =>
      Animated.timing(v, { toValue: to, duration: dur, delay, easing: ease, useNativeDriver });

    anim(modalBackdropOpacity, 1, 220).start();

    t.push(setTimeout(() => {
      Animated.parallel([
        anim(modalCardOpacity,   1, 260, 0, Easing.out(Easing.cubic)),
        anim(modalCardScale,     1, MODAL_CARD.duration, 0, MODAL_CARD.easing),
        anim(modalCardTranslate, 0, MODAL_CARD.duration, 0, MODAL_CARD.easing),
      ]).start();
    }, TIMING.modalCard));

    t.push(setTimeout(() => { anim(modalTitleOpacity, 1, 240).start(); }, TIMING.modalTitle));
    t.push(setTimeout(() => { anim(modalBodyOpacity,  1, 240).start(); }, TIMING.modalBody));
    t.push(setTimeout(() => {
      Animated.parallel([
        anim(modalBtn1Opacity,   1, 240, 0),
        anim(modalBtn1Translate, 0, 240, 0),
        anim(modalBtn2Opacity,   1, 240, 70),
        anim(modalBtn2Translate, 0, 240, 70),
      ]).start();
    }, TIMING.modalButtons));

    return () => t.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalVisible]);

  /* ─── Timer logic ───────────────────────────────────────── */
  useEffect(() => { void logAnalyticsEvent("mini_pomodoro_opened"); }, []);
  useEffect(() => { runStateRef.current = runState; }, [runState]);

  const loadHistory = useCallback(async () => {
    try {
      const next = await historyRepo.getAll();
      setEntries(next);
      setHistoryErrorMessage(null);
      await logAnalyticsEvent("pomodoro_history_loaded", { entry_count: next.length });
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
    let active = true;
    const run = async () => {
      try {
        const h = await timerStore.hydrate();
        if (active) { setRunState(h); setErrorMessage(null); }
      } catch {
        if (active) setErrorMessage("Could not load timer state.");
      } finally {
        if (active) setIsHydrated(true);
      }
    };
    void run();
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") { void syncFromStorage(); }
    });
    return () => { active = false; sub.remove(); };
  }, [syncFromStorage]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (runState.status !== "running" || runState.endAtEpochMs === null) return;
    const id = setInterval(() => {
      setRunState(prev => {
        if (prev.status !== "running" || prev.endAtEpochMs === null) return prev;
        return { ...prev, remainingSec: computeRemainingSec(prev.endAtEpochMs) };
      });
    }, 250);
    return () => clearInterval(id);
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
      setIsModalVisible(true);
      completionLockRef.current = false;
    }
  }, [loadHistory, syncFromStorage]);

  useEffect(() => {
    if (!isHydrated) return;
    if (runState.status === "running" && runState.remainingSec <= 0) void completeSession();
  }, [completeSession, isHydrated, runState.remainingSec, runState.status]);

  const handlePrimary = useCallback(async () => {
    try {
      setErrorMessage(null);
      if (runState.status === "running") {
        await timerStore.pause();
        await logAnalyticsEvent("pomodoro_paused", { remaining_sec: runState.remainingSec });
      } else if (runState.status === "paused") {
        await timerStore.resume();
        await logAnalyticsEvent("pomodoro_resumed", { remaining_sec: runState.remainingSec });
      } else {
        setIsModalVisible(false);
        await timerStore.start();
        await logAnalyticsEvent("pomodoro_started", { duration_sec: SESSION_DURATION_SEC });
      }
      await syncFromStorage();
    } catch { setErrorMessage("Could not update timer."); }
  }, [runState.remainingSec, runState.status, syncFromStorage]);

  const handleReset = useCallback(async () => {
    try {
      await timerStore.reset();
      await logAnalyticsEvent("pomodoro_reset", { remaining_sec: runState.remainingSec });
      await syncFromStorage();
      setErrorMessage(null);
    } catch { setErrorMessage("Could not reset timer."); }
  }, [runState.remainingSec, syncFromStorage]);

  const dismissModal = useCallback(() => setIsModalVisible(false), []);

  const handleNextSession = useCallback(async () => {
    try {
      setIsModalVisible(false);
      setErrorMessage(null);
      await timerStore.start();
      await logAnalyticsEvent("pomodoro_started_from_modal", { duration_sec: SESSION_DURATION_SEC });
      await syncFromStorage();
    } catch { setErrorMessage("Could not start next session."); }
  }, [syncFromStorage]);

  /* ─── Derived ───────────────────────────────────────────── */
  const btnLabel      = primaryLabel(runState.status);
  const statusText    = useMemo(() => statusLabel(runState.status), [runState.status]);
  const resetDisabled = runState.status === "idle" && runState.remainingSec === POMODORO_SECONDS;

  const glowBorderColor = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [theme.colors.border, theme.colors.accentGlow],
  });

  const heroWidth    = isDesktop ? desktopHeroWidth    : stackedContentWidth;
  const historyWidth = isDesktop ? desktopHistoryWidth : stackedContentWidth;
  const modalWidth   = Math.min(isDesktop ? desktopHistoryWidth : stackedContentWidth, 380);

  /* ─── Hero card ─────────────────────────────────────────── */
  const heroCard = (
    <Animated.View
      style={[
        styles.heroSection,
        isDesktop && styles.heroSectionDesktop,
        { borderColor: runState.status === "running" ? glowBorderColor : theme.colors.border },
      ]}
    >
      {/* Status header */}
      <Animated.View
        style={[styles.heroHeader, { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }]}
      >
        <Text style={styles.appName}>STARDEW FOCUS</Text>
        <Text style={styles.statusText}>{statusText}</Text>
      </Animated.View>

      {/* Timer */}
      <Animated.View
        style={[
          styles.timerWrap,
          {
            opacity:   timerCardOpacity,
            transform: [{ scale: timerCardScale }, { translateY: timerCardTranslate }],
          },
        ]}
      >
        <CircularTimer
          remainingSec={runState.remainingSec}
          size={timerSize}
          totalSec={SESSION_DURATION_SEC}
        />
      </Animated.View>

      {/* Controls */}
      <Animated.View
        style={[
          styles.controlsWrap,
          isNarrow && styles.controlsWrapStacked,
          { opacity: controlsOpacity, transform: [{ translateY: controlsTranslate }] },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={handlePrimary}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
        >
          <Text style={styles.primaryBtnText}>{btnLabel}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={resetDisabled}
          onPress={handleReset}
          style={({ pressed }) => [
            styles.secondaryBtn,
            resetDisabled && styles.secondaryBtnDisabled,
            pressed && !resetDisabled && styles.btnPressed,
          ]}
        >
          <Text style={[styles.secondaryBtnText, resetDisabled && styles.secondaryBtnTextDisabled]}>
            Reset day
          </Text>
        </Pressable>
      </Animated.View>

      {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
    </Animated.View>
  );

  /* ─── Render ────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.root}>
      {/* Warm ambient bg */}
      <View pointerEvents="none" style={styles.bgLayer}>
        <View style={[styles.bgGlow, styles.bgGlowTop]} />
        <View style={[styles.bgGlow, styles.bgGlowBottom]} />
      </View>

      {isDesktop ? (
        <View style={[styles.desktopShell, { paddingHorizontal: horizontalInset, paddingTop: theme.spacing.lg }]}>
          <View style={[styles.desktopGrid, { width: desktopShellWidth }]}>
            <View style={{ width: heroWidth, alignSelf: "stretch" }}>{heroCard}</View>

            <View style={[styles.desktopHistoryPanel, { width: historyWidth }]}>
              <Animated.View style={[styles.historyHeaderDesktop, { opacity: historyOpacity }]}>
                <Text style={styles.historyTitle}>Farmer's log</Text>
                <Text style={styles.historySubtitle}>completed day cycles</Text>
                {!!historyErrorMessage && <Text style={styles.errorText}>{historyErrorMessage}</Text>}
              </Animated.View>

              <FlatList
                contentContainerStyle={styles.desktopListContent}
                data={entries}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <View style={styles.emptyWrapDesktop}>
                    <Text style={styles.emptyMug}>🌻</Text>
                    <Text style={styles.emptyTitle}>No harvests yet</Text>
                    <Text style={styles.emptySubtitle}>Finish your first farm day to log it.</Text>
                  </View>
                }
                renderItem={({ item, index }) => (
                  <View style={[styles.row, styles.rowFullWidth]}>
                    <View style={styles.rowNum}>
                      <Text style={styles.rowNumText}>{index + 1}</Text>
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowDate}>{formatDate(item.completedAtISO)}</Text>
                      <Text style={styles.rowMeta}>started {formatTime(item.startedAtISO)}</Text>
                    </View>
                    <View style={styles.rowDot} />
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
                <Text style={styles.historyTitle}>Farmer's log</Text>
                <Text style={styles.historySubtitle}>completed day cycles</Text>
                {!!historyErrorMessage && <Text style={styles.errorText}>{historyErrorMessage}</Text>}
              </Animated.View>
            </View>
          }
          ListEmptyComponent={
            <View style={[styles.emptyWrap, { width: stackedContentWidth }]}>
              <Text style={styles.emptyMug}>🌻</Text>
              <Text style={styles.emptyTitle}>No harvests yet</Text>
              <Text style={styles.emptySubtitle}>Finish your first farm day to log it.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={[styles.row, { width: stackedContentWidth }]}>
              <View style={styles.rowNum}>
                <Text style={styles.rowNumText}>{index + 1}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowDate}>{formatDate(item.completedAtISO)}</Text>
                <Text style={styles.rowMeta}>started {formatTime(item.startedAtISO)}</Text>
              </View>
              <View style={styles.rowDot} />
            </View>
          )}
        />
      )}

      {/* ─── Completion modal ─── */}
      <Modal animationType="none" onRequestClose={dismissModal} transparent visible={isModalVisible}>
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
            {/* Warm stripe at top */}
            <View style={styles.modalStripe} />

            <Animated.Text style={[styles.modalTitle, { opacity: modalTitleOpacity }]}>
              Harvest complete!
            </Animated.Text>

            <Animated.Text style={[styles.modalBody, { opacity: modalBodyOpacity }]}>
              You finished one full farm day.{"\n"}Take a short rest, then tend the next crop.
            </Animated.Text>

            <View style={[styles.modalActions, isNarrow && styles.modalActionsStacked]}>
              <Animated.View
                style={[styles.modalBtnWrap, { opacity: modalBtn1Opacity, transform: [{ translateY: modalBtn1Translate }] }]}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={dismissModal}
                  style={({ pressed }) => [styles.modalSecondaryBtn, pressed && styles.btnPressed]}
                >
                  <Text style={styles.modalSecondaryBtnText}>Campfire break</Text>
                </Pressable>
              </Animated.View>

              <Animated.View
                style={[styles.modalBtnWrap, { opacity: modalBtn2Opacity, transform: [{ translateY: modalBtn2Translate }] }]}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={handleNextSession}
                  style={({ pressed }) => [styles.modalPrimaryBtn, pressed && styles.btnPressed]}
                >
                  <Text style={styles.modalPrimaryBtnText}>Start next day</Text>
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
  appName: {
    color:         theme.colors.textSecondary,
    fontFamily:    theme.typography.heading,
    fontSize:      14,
    letterSpacing: 1.4,
    marginBottom:  4,
  },
  bgGlow: {
    borderRadius: 200,
    position:     "absolute",
  },
  bgGlowBottom: {
    backgroundColor: theme.colors.glowB,
    height:    440,
    opacity:   0.4,
    right:     -180,
    top:       "52%",
    width:     440,
  },
  bgGlowTop: {
    backgroundColor: theme.colors.glowA,
    height:    520,
    left:      -210,
    opacity:   0.38,
    top:       -180,
    width:     520,
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  btnPressed: {
    opacity:   0.78,
    transform: [{ scale: 0.962 }],
  },
  controlsWrap: {
    flexDirection: "row",
    gap:           theme.spacing.sm,
    marginTop:     theme.spacing.md,
    width:         "100%",
  },
  controlsWrapStacked: {
    flexDirection: "column",
  },
  desktopGrid: {
    alignItems:    "stretch",
    flexDirection: "row",
    gap:           theme.spacing.xl,
  },
  desktopHistoryPanel: {
    backgroundColor: theme.colors.surface,
    borderColor:     theme.colors.border,
    borderRadius:    theme.radius.lg,
    borderWidth:     2,
    flex:            1,
    overflow:        "hidden",
    paddingHorizontal: theme.spacing.md,
    paddingTop:      theme.spacing.md,
    shadowColor:     theme.colors.glowShadow,
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.6,
    shadowRadius:    18,
  },
  desktopListContent: {
    paddingBottom: theme.spacing.sm,
  },
  desktopShell: {
    alignItems:     "center",
    flex:           1,
    justifyContent: "flex-start",
  },
  emptyMug: {
    fontSize:    42,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    color:         theme.colors.textMuted,
    fontFamily:    theme.typography.body,
    fontSize:      12,
    letterSpacing: 0.5,
    marginTop:     5,
    textAlign:     "center",
  },
  emptyTitle: {
    color:      theme.colors.textSecondary,
    fontFamily: theme.typography.heading,
    fontSize:   14,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textAlign:  "center",
  },
  emptyWrap: {
    alignItems:      "center",
    marginTop:       theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyWrapDesktop: {
    alignItems:      "center",
    marginTop:       theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  errorText: {
    color:       theme.colors.danger,
    fontFamily:  theme.typography.body,
    fontSize:    12,
    marginTop:   theme.spacing.sm,
    textAlign:   "center",
  },
  heroHeader: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingTop:   theme.spacing.sm,
  },
  heroSection: {
    alignItems:      "center",
    backgroundColor: theme.colors.surface,
    borderColor:     theme.colors.border,
    borderRadius:    theme.radius.lg,
    borderWidth:     2,
    marginBottom:    theme.spacing.lg,
    overflow:        "hidden",
    paddingBottom:   theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop:      0,
    shadowColor:     theme.colors.glowShadow,
    shadowOffset:    { width: 0, height: 10 },
    shadowOpacity:   0.75,
    shadowRadius:    20,
  },
  heroSectionDesktop: {
    flex:         1,
    marginBottom: 0,
  },
  historyHeader: {
    marginBottom:    theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  historyHeaderDesktop: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 2,
    marginBottom:    theme.spacing.md,
    paddingBottom:   theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  historySubtitle: {
    color:      theme.colors.textMuted,
    fontFamily: theme.typography.body,
    fontSize:   11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop:  3,
  },
  historyTitle: {
    color:      theme.colors.textSecondary,
    fontFamily: theme.typography.heading,
    fontSize:   13,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  listContent: {
    alignItems:    "center",
    paddingBottom: theme.spacing.xl,
  },
  modalActions: {
    flexDirection: "row",
    gap:           theme.spacing.sm,
    marginTop:     theme.spacing.lg,
    width:         "100%",
  },
  modalActionsStacked: {
    flexDirection: "column-reverse",
  },
  modalBackdrop: {
    alignItems:      "center",
    backgroundColor: theme.colors.overlay,
    flex:            1,
    justifyContent:  "center",
    paddingHorizontal: theme.spacing.lg,
  },
  modalBody: {
    color:       theme.colors.textSecondary,
    fontFamily:  theme.typography.body,
    fontSize:    14,
    lineHeight:  22,
    marginTop:   theme.spacing.sm,
    textAlign:   "center",
  },
  modalBtnWrap: {
    flex: 1,
  },
  modalCard: {
    alignItems:      "center",
    backgroundColor: theme.colors.surface,
    borderColor:     theme.colors.border,
    borderRadius:    theme.radius.lg,
    borderWidth:     2,
    overflow:        "hidden",
    paddingBottom:   theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop:      0,
    shadowColor:     theme.colors.glowShadow,
    shadowOffset:    { width: 0, height: 12 },
    shadowOpacity:   0.65,
    shadowRadius:    24,
  },
  modalPrimaryBtn: {
    alignItems:      "center",
    backgroundColor: theme.colors.accent,
    borderColor:     theme.colors.accentSecondary,
    borderRadius:    theme.radius.md,
    borderWidth:     2,
    flex:            1,
    justifyContent:  "center",
    minHeight:       50,
    paddingHorizontal: theme.spacing.md,
    shadowColor:     theme.colors.accentSecondary,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.6,
    shadowRadius:    10,
  },
  modalPrimaryBtnText: {
    color:      theme.colors.surface,
    fontFamily: theme.typography.heading,
    fontSize:   12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  modalSecondaryBtn: {
    alignItems:      "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor:     theme.colors.border,
    borderRadius:    theme.radius.md,
    borderWidth:     2,
    flex:            1,
    justifyContent:  "center",
    minHeight:       50,
    paddingHorizontal: theme.spacing.md,
  },
  modalSecondaryBtnText: {
    color:      theme.colors.textSecondary,
    fontFamily: theme.typography.body,
    fontSize:   12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  modalStripe: {
    backgroundColor: theme.colors.accentGlow,
    borderBottomColor: theme.colors.borderSubtle,
    borderBottomWidth: 2,
    height:          8,
    marginBottom:    theme.spacing.lg,
    opacity:         0.8,
    width:           "100%",
  },
  modalTitle: {
    color:      theme.colors.textPrimary,
    fontFamily: theme.typography.heading,
    fontSize:   20,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    textAlign:  "center",
  },
  primaryBtn: {
    alignItems:      "center",
    backgroundColor: theme.colors.accent,
    borderColor:     theme.colors.accentSecondary,
    borderRadius:    theme.radius.md,
    borderWidth:     2,
    flex:            1,
    justifyContent:  "center",
    minHeight:       52,
    shadowColor:     theme.colors.accentSecondary,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.6,
    shadowRadius:    10,
  },
  primaryBtnText: {
    color:      theme.colors.surface,
    fontFamily: theme.typography.heading,
    fontSize:   12,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  root: {
    backgroundColor: theme.colors.background,
    flex:            1,
  },
  row: {
    alignItems:      "center",
    backgroundColor: theme.colors.surface,
    borderColor:     theme.colors.border,
    borderRadius:    theme.radius.md,
    borderWidth:     2,
    flexDirection:   "row",
    marginBottom:    theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
  },
  rowDate: {
    color:      theme.colors.textPrimary,
    fontFamily: theme.typography.body,
    fontSize:   12,
    letterSpacing: 0.5,
  },
  rowDot: {
    backgroundColor: theme.colors.accent,
    borderRadius:    4,
    height:          8,
    opacity:         0.5,
    width:           8,
  },
  rowFullWidth: {
    width: "100%",
  },
  rowInfo: {
    flex: 1,
  },
  rowMeta: {
    color:      theme.colors.textMuted,
    fontFamily: theme.typography.body,
    fontSize:   10,
    letterSpacing: 0.4,
    marginTop:  3,
  },
  rowNum: {
    alignItems:      "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderSubtle,
    borderRadius:    theme.radius.sm,
    borderWidth: 1,
    height:          32,
    justifyContent:  "center",
    marginRight:     theme.spacing.md,
    width:           32,
  },
  rowNumText: {
    color:      theme.colors.textMuted,
    fontFamily: theme.typography.body,
    fontSize:   11,
  },
  secondaryBtn: {
    alignItems:      "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor:     theme.colors.border,
    borderRadius:    theme.radius.md,
    borderWidth:     2,
    flex:            1,
    justifyContent:  "center",
    minHeight:       52,
  },
  secondaryBtnDisabled: {
    opacity: 0.3,
  },
  secondaryBtnText: {
    color:      theme.colors.textSecondary,
    fontFamily: theme.typography.body,
    fontSize:   12,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  secondaryBtnTextDisabled: {
    color: theme.colors.textMuted,
  },
  statusText: {
    color:      theme.colors.textMuted,
    fontFamily: theme.typography.body,
    fontSize:   11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  timerWrap: {
    alignItems:      "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor:     theme.colors.borderSubtle,
    borderRadius:    theme.radius.lg,
    borderWidth:     2,
    marginBottom:    theme.spacing.md,
    marginTop:       theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    width:           "100%",
  },
});

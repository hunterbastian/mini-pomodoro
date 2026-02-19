import { Asset } from "expo-asset";
import { Audio, type AVPlaybackStatus } from "expo-av";
import { Platform } from "react-native";

const CHIME_SOURCE = require("../../assets/chime.wav");

async function playWebAssetChimeAsync(): Promise<boolean> {
  const AudioCtor = (globalThis as { Audio?: unknown }).Audio;

  if (typeof AudioCtor !== "function") {
    return false;
  }

  try {
    const asset = Asset.fromModule(CHIME_SOURCE);
    if (!asset.localUri && !asset.uri) {
      await asset.downloadAsync();
    }

    const src = asset.localUri ?? asset.uri;
    if (!src) {
      return false;
    }

    const element = new (AudioCtor as new (source?: string) => {
      preload: string;
      volume: number;
      onended: (() => void) | null;
      onerror: (() => void) | null;
      play: () => Promise<void>;
    })(src);
    element.preload = "auto";
    element.volume = 0.75;

    await element.play();

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 1400);

      const finish = () => {
        clearTimeout(timeout);
        resolve();
      };

      element.onended = finish;
      element.onerror = finish;
    });

    return true;
  } catch {
    return false;
  }
}

async function playWebOscillatorChimeAsync(): Promise<void> {
  const AudioContextCtor =
    (globalThis as { AudioContext?: unknown }).AudioContext ??
    (globalThis as { webkitAudioContext?: unknown }).webkitAudioContext;

  if (typeof AudioContextCtor !== "function") {
    return;
  }

  try {
    const audioContext = new (AudioContextCtor as new () => {
      createOscillator: () => {
        type: string;
        frequency: { value: number };
        connect: (node: unknown) => void;
        start: (at?: number) => void;
        stop: (at?: number) => void;
      };
      createGain: () => {
        gain: {
          value: number;
          exponentialRampToValueAtTime: (value: number, endTime: number) => void;
        };
        connect: (node: unknown) => void;
      };
      destination: unknown;
      currentTime: number;
      close: () => Promise<void>;
    })();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.0001;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const now = audioContext.currentTime;
    gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    oscillator.start(now);
    oscillator.stop(now + 0.36);

    await new Promise<void>((resolve) => setTimeout(resolve, 420));
    await audioContext.close();
  } catch {
    // Ignore web audio fallback errors.
  }
}

export async function playCompletionChimeAsync(): Promise<void> {
  if (Platform.OS === "web") {
    const playedFromAsset = await playWebAssetChimeAsync();
    if (!playedFromAsset) {
      await playWebOscillatorChimeAsync();
    }
    return;
  }

  let sound: Audio.Sound | null = null;

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });

    const loaded = await Audio.Sound.createAsync(CHIME_SOURCE, {
      shouldPlay: true,
      volume: 0.75,
    });

    sound = loaded.sound;

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 1000);

      sound?.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) {
          return;
        }

        if (status.didJustFinish) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  } catch {
    // Audio failures should not block session completion.
  } finally {
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch {
        // ignore unload errors
      }
    }
  }
}

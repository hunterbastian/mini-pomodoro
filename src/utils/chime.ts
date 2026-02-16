import { Audio, type AVPlaybackStatus } from "expo-av";

const CHIME_SOURCE = require("../../assets/chime.wav");

export async function playCompletionChimeAsync(): Promise<void> {
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

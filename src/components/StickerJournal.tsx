import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme/tokens";

type StickerJournalProps = {
  completedSessions: number;
};

type Sticker = {
  color: string;
  icon: string;
  id: string;
  label: string;
  unlockAt: number;
};

const STICKERS: Sticker[] = [
  { id: "tea-mug", label: "Signal Ping", icon: "🍵", unlockAt: 1, color: "rgba(200, 147, 90, 0.15)" },
  { id: "leaf", label: "First Light", icon: "🍃", unlockAt: 2, color: "rgba(90, 138, 92, 0.15)" },
  { id: "note", label: "Log Entry", icon: "📓", unlockAt: 3, color: "rgba(200, 147, 90, 0.12)" },
  { id: "spark", label: "Spark", icon: "✨", unlockAt: 4, color: "rgba(232, 176, 106, 0.15)" },
  { id: "moon", label: "Night Watch", icon: "🌙", unlockAt: 6, color: "rgba(130, 120, 160, 0.12)" },
  { id: "headphones", label: "Lo-Fi Loop", icon: "🎧", unlockAt: 8, color: "rgba(100, 130, 160, 0.12)" },
  { id: "book", label: "Quiet Read", icon: "📚", unlockAt: 10, color: "rgba(160, 140, 110, 0.12)" },
  { id: "star", label: "Steady Star", icon: "⭐", unlockAt: 12, color: "rgba(232, 176, 106, 0.15)" },
  { id: "ribbon", label: "Gold Ribbon", icon: "🎀", unlockAt: 16, color: "rgba(180, 130, 140, 0.12)" },
];

export function StickerJournal({ completedSessions }: StickerJournalProps) {
  const unlockedCount = STICKERS.filter((sticker) => completedSessions >= sticker.unlockAt).length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Sticker Journal</Text>
        <Text style={styles.counter}>
          {unlockedCount}/{STICKERS.length}
        </Text>
      </View>

      <Text style={styles.copy}>Settle in and take a breather.</Text>

      <View style={styles.grid}>
        {STICKERS.map((sticker) => {
          const unlocked = completedSessions >= sticker.unlockAt;
          return (
            <View key={sticker.id} style={[styles.tile, unlocked ? styles.tileUnlocked : styles.tileLocked]}>
              <View
                style={[
                  styles.iconWrap,
                  unlocked ? { backgroundColor: sticker.color } : styles.iconWrapLocked,
                ]}
              >
                <Text style={styles.icon}>{unlocked ? sticker.icon : "◻"}</Text>
              </View>
              <Text style={[styles.label, !unlocked && styles.labelLocked]}>{sticker.label}</Text>
              <Text style={styles.unlockText}>{unlocked ? "Collected" : `${sticker.unlockAt} sessions`}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#141820",
    borderColor: "#2a2e38",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  copy: {
    color: "#5c564e",
    fontFamily: theme.typography.body,
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  counter: {
    backgroundColor: "#c8935a",
    borderColor: "#9a6d3a",
    borderWidth: 1,
    color: "#0a0c0f",
    fontFamily: theme.typography.heading,
    fontSize: 11,
    letterSpacing: 0.6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  icon: {
    fontSize: 16,
    lineHeight: 18,
  },
  iconWrap: {
    alignItems: "center",
    borderColor: "#2a2e38",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    marginBottom: 4,
    width: 34,
  },
  iconWrapLocked: {
    backgroundColor: "#1a1f2a",
  },
  label: {
    color: "#8a8278",
    fontFamily: theme.typography.heading,
    fontSize: 10,
    letterSpacing: 0.5,
    textAlign: "center",
    textTransform: "uppercase",
  },
  labelLocked: {
    opacity: 0.5,
  },
  tile: {
    alignItems: "center",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    minHeight: 90,
    paddingHorizontal: 4,
    paddingTop: 6,
    width: "31%",
  },
  tileLocked: {
    backgroundColor: "#1a1f2a",
    borderColor: "#22262e",
  },
  tileUnlocked: {
    backgroundColor: "rgba(200, 147, 90, 0.06)",
    borderColor: "rgba(200, 147, 90, 0.2)",
  },
  title: {
    color: "#d8d0c4",
    fontFamily: theme.typography.heading,
    fontSize: 16,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  unlockText: {
    color: "#5c564e",
    fontFamily: theme.typography.body,
    fontSize: 9,
    marginTop: 2,
    textAlign: "center",
    textTransform: "uppercase",
  },
});

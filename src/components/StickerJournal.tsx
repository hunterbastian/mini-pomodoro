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
  { id: "tea-mug", label: "Tea Time", icon: "🍵", unlockAt: 1, color: "#f6dfab" },
  { id: "leaf", label: "Fresh Leaf", icon: "🍃", unlockAt: 2, color: "#dcefa6" },
  { id: "note", label: "Journal Note", icon: "📓", unlockAt: 3, color: "#f5d3a8" },
  { id: "spark", label: "Spark", icon: "✨", unlockAt: 4, color: "#f9e2a6" },
  { id: "moon", label: "Night Owl", icon: "🌙", unlockAt: 6, color: "#d9d7f2" },
  { id: "headphones", label: "Lo-Fi Loop", icon: "🎧", unlockAt: 8, color: "#d3e3f2" },
  { id: "book", label: "Quiet Read", icon: "📚", unlockAt: 10, color: "#e0d7bc" },
  { id: "star", label: "Steady Star", icon: "⭐", unlockAt: 12, color: "#f7e2a8" },
  { id: "ribbon", label: "Gold Ribbon", icon: "🎀", unlockAt: 16, color: "#f4ccd8" },
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
    backgroundColor: "#e6dcb8",
    borderColor: "#222",
    borderRadius: 2,
    borderWidth: 3,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  copy: {
    color: "#6b543f",
    fontFamily: theme.typography.body,
    fontSize: 12,
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  counter: {
    backgroundColor: "#7ba646",
    borderColor: "#3b2116",
    borderWidth: 2,
    color: "#fff",
    fontFamily: theme.typography.heading,
    fontSize: 11,
    letterSpacing: 0.4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
    borderColor: "#3b2116",
    borderRadius: 2,
    borderWidth: 2,
    height: 34,
    justifyContent: "center",
    marginBottom: 4,
    width: 34,
  },
  iconWrapLocked: {
    backgroundColor: "#c8b99a",
  },
  label: {
    color: "#3b2116",
    fontFamily: theme.typography.heading,
    fontSize: 10,
    letterSpacing: 0.3,
    textAlign: "center",
    textTransform: "uppercase",
  },
  labelLocked: {
    opacity: 0.65,
  },
  tile: {
    alignItems: "center",
    borderRadius: 2,
    borderWidth: 2,
    minHeight: 90,
    paddingHorizontal: 4,
    paddingTop: 6,
    width: "31%",
  },
  tileLocked: {
    backgroundColor: "#d6c8a6",
    borderColor: "#9c8c6f",
  },
  tileUnlocked: {
    backgroundColor: "#f2e8c9",
    borderColor: "#3b2116",
  },
  title: {
    color: "#3b2116",
    fontFamily: theme.typography.heading,
    fontSize: 16,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  unlockText: {
    color: "#6b543f",
    fontFamily: theme.typography.body,
    fontSize: 9,
    marginTop: 2,
    textAlign: "center",
    textTransform: "uppercase",
  },
});

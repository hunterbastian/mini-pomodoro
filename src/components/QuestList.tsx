import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme/tokens";

export type QuestItem = {
  id: string;
  title: string;
  durationLabel: string;
};

type QuestListProps = {
  activeQuestId: string;
  onSelectQuest: (questId: string) => void;
  quests: QuestItem[];
};

export function QuestList({
  activeQuestId,
  onSelectQuest,
  quests,
}: QuestListProps) {
  return (
    <View style={styles.list}>
      {quests.map((quest) => {
        const isActive = quest.id === activeQuestId;

        return (
          <Pressable
            accessibilityRole="button"
            key={quest.id}
            onPress={() => onSelectQuest(quest.id)}
            style={({ pressed }) => [
              styles.item,
              isActive && styles.itemActive,
              pressed && styles.itemPressed,
            ]}
          >
            <Text style={[styles.itemTitle, isActive && styles.itemTitleActive]}>{quest.title}</Text>
            <View style={[styles.hintWrap, isActive && styles.hintWrapActive]}>
              <Text style={[styles.hintText, isActive && styles.hintTextActive]}>
                {isActive ? "Active" : quest.durationLabel}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hintText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  hintTextActive: {
    color: "#0a0c0f",
  },
  hintWrap: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 64,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hintWrapActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accentSecondary,
  },
  item: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  itemActive: {
    backgroundColor: "rgba(200, 147, 90, 0.08)",
    borderColor: "rgba(200, 147, 90, 0.3)",
    shadowColor: "rgba(200, 147, 90, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  itemPressed: {
    opacity: 0.86,
  },
  itemTitle: {
    color: theme.colors.textPrimary,
    flex: 1,
    fontFamily: theme.typography.heading,
    fontSize: 15,
    marginRight: 12,
  },
  itemTitleActive: {
    color: theme.colors.accent,
  },
  list: {
    gap: 6,
  },
});

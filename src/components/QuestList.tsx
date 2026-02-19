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
    color: theme.colors.surface,
    fontFamily: theme.typography.body,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  hintTextActive: {
    color: theme.colors.textPrimary,
  },
  hintWrap: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.65)",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 64,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hintWrapActive: {
    backgroundColor: theme.colors.accentGlow,
    borderColor: theme.colors.textPrimary,
  },
  item: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "transparent",
    borderRadius: theme.radius.md,
    borderWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  itemActive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.textPrimary,
    shadowColor: theme.colors.glowShadow,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
  },
  itemPressed: {
    opacity: 0.86,
  },
  itemTitle: {
    color: theme.colors.surface,
    flex: 1,
    fontFamily: theme.typography.heading,
    fontSize: 18,
    marginRight: 12,
  },
  itemTitleActive: {
    color: theme.colors.textPrimary,
  },
  list: {
    gap: theme.spacing.sm,
  },
});

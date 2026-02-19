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
    color: "#3b2116",
    fontFamily: theme.typography.body,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  hintTextActive: {
    color: "#3b2116",
  },
  hintWrap: {
    alignItems: "center",
    borderColor: "#3b2116",
    borderRadius: 2,
    borderWidth: 2,
    justifyContent: "center",
    minWidth: 64,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hintWrapActive: {
    backgroundColor: "#7ba646",
    borderColor: "#3b2116",
  },
  item: {
    alignItems: "center",
    backgroundColor: "#e6dcb8",
    borderColor: "#222",
    borderRadius: 2,
    borderWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  itemActive: {
    backgroundColor: "#d4cba3",
    borderColor: "#3b2116",
    shadowColor: "rgba(0,0,0,0.45)",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.7,
    shadowRadius: 0,
  },
  itemPressed: {
    opacity: 0.86,
  },
  itemTitle: {
    color: "#3b2116",
    flex: 1,
    fontFamily: theme.typography.heading,
    fontSize: 17,
    marginRight: 12,
  },
  itemTitleActive: {
    color: "#3b2116",
  },
  list: {
    gap: 8,
  },
});

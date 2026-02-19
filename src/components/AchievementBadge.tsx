import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme/tokens";

type AchievementBadgeProps = {
  completedSessions: number;
};

function resolveBadge(completedSessions: number): {
  icon: string;
  title: string;
} {
  if (completedSessions >= 12) {
    return { icon: "🏆", title: "Master Focus Emblem" };
  }

  if (completedSessions >= 8) {
    return { icon: "🧭", title: "Momentum Crest" };
  }

  if (completedSessions >= 4) {
    return { icon: "🎖️", title: "Consistency Pin" };
  }

  return { icon: "🌻", title: "Productivity Cap" };
}

export function AchievementBadge({ completedSessions }: AchievementBadgeProps) {
  const { icon, title } = resolveBadge(completedSessions);
  const remainder = completedSessions % 4;
  const sessionsToNext = remainder === 0 ? 4 : 4 - remainder;

  return (
    <View style={styles.container}>
      <View style={styles.labelWrap}>
        <Text style={styles.labelText}>Item Badge</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>
            Complete {sessionsToNext} more focus session{sessionsToNext === 1 ? "" : "s"} to
            unlock your next reward.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: "#e6dcb8",
    borderColor: "#222",
    borderRadius: 2,
    borderWidth: 3,
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  container: {
    marginTop: theme.spacing.lg,
  },
  description: {
    color: "#5a3b1d",
    fontFamily: theme.typography.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  iconText: {
    fontSize: 32,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "#7ba646",
    borderColor: "#3b2116",
    borderRadius: theme.radius.md,
    borderWidth: 3,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  labelText: {
    color: "#fff",
    fontFamily: theme.typography.heading,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  labelWrap: {
    alignSelf: "flex-end",
    backgroundColor: "#4a6e3a",
    borderColor: "#222",
    borderRadius: 2,
    borderWidth: 2,
    marginBottom: -12,
    marginRight: theme.spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 5,
    zIndex: 1,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: "#3b2116",
    fontFamily: theme.typography.heading,
    fontSize: 19,
  },
});

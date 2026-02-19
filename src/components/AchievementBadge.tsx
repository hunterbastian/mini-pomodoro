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
    backgroundColor: "rgba(0,0,0,0.62)",
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  container: {
    marginTop: theme.spacing.xl,
  },
  description: {
    color: "rgba(255,255,255,0.9)",
    fontFamily: theme.typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  iconText: {
    fontSize: 32,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.accentGlow,
    borderColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 3,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  labelText: {
    color: theme.colors.surface,
    fontFamily: theme.typography.heading,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  labelWrap: {
    alignSelf: "flex-end",
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.textPrimary,
    borderRadius: theme.radius.pill,
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
    color: theme.colors.surface,
    fontFamily: theme.typography.heading,
    fontSize: 20,
  },
});

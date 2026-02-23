"use client";

export type QuestItem = {
  id: string;
  title: string;
  durationLabel: string;
};

type Props = {
  activeQuestId: string;
  onSelectQuest: (questId: string) => void;
  quests: QuestItem[];
};

export function QuestList({ activeQuestId, onSelectQuest, quests }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {quests.map((quest) => {
        const isActive = quest.id === activeQuestId;
        return (
          <button
            key={quest.id}
            onClick={() => onSelectQuest(quest.id)}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-200 ${
              isActive
                ? "border-accent/30 bg-accent/8"
                : "border-border/50 bg-surface-muted/40 hover:border-border hover:bg-surface-muted/70"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  isActive ? "bg-accent" : "bg-border"
                }`}
              />
              <span
                className={`font-mono text-[13px] ${
                  isActive ? "text-accent" : "text-foreground-secondary"
                }`}
              >
                {quest.title}
              </span>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                isActive
                  ? "bg-accent text-background"
                  : "text-foreground-muted"
              }`}
            >
              {isActive ? "Active" : quest.durationLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

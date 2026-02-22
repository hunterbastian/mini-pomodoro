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
    <div className="flex flex-col gap-1.5">
      {quests.map((quest) => {
        const isActive = quest.id === activeQuestId;
        return (
          <button
            key={quest.id}
            onClick={() => onSelectQuest(quest.id)}
            className={`flex items-center justify-between rounded-sm border px-4 py-3 transition-all duration-200 ${
              isActive
                ? "border-accent/30 bg-accent/8 shadow-[0_2px_6px_rgba(200,147,90,0.1)]"
                : "border-border bg-surface-muted hover:border-border-highlight hover:bg-surface-muted/80"
            }`}
          >
            <span
              className={`font-mono text-[15px] ${
                isActive ? "text-accent" : "text-foreground"
              }`}
            >
              {quest.title}
            </span>
            <span
              className={`inline-flex items-center justify-center min-w-16 rounded-sm border px-2 py-1 font-mono text-[11px] uppercase tracking-wider ${
                isActive
                  ? "border-accent-secondary bg-accent text-background"
                  : "border-border text-foreground-secondary"
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

"use client";

import { useState } from "react";
import { SceneryBackground } from "@/components/scenery-background";
import { TimerPanel } from "@/components/timer-panel";
import { HistoryPanel } from "@/components/history-panel";

type Tab = "timer" | "history";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("timer");

  return (
    <main className="relative min-h-screen flex flex-col">
      <SceneryBackground />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-4 pt-10 pb-28 lg:justify-center lg:pt-20 lg:pb-6">
        {activeTab === "timer" ? <TimerPanel /> : <HistoryPanel />}
      </div>

      {/* Tab bar -- floating pill */}
      <nav
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex rounded-full border border-border bg-surface/80 backdrop-blur-md p-1 lg:top-5 lg:bottom-auto"
        role="tablist"
      >
        <TabButton
          active={activeTab === "timer"}
          label="Timer"
          onClick={() => setActiveTab("timer")}
        />
        <TabButton
          active={activeTab === "history"}
          label="History"
          onClick={() => setActiveTab("history")}
        />
      </nav>
    </main>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-all duration-200 ${
        active
          ? "bg-accent text-background"
          : "text-foreground-secondary hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

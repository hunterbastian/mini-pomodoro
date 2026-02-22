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
      <div className="relative z-10 flex-1 flex flex-col items-center px-4 pt-6 pb-28 lg:justify-center lg:pb-6">
        {activeTab === "timer" ? <TimerPanel /> : <HistoryPanel />}
      </div>

      {/* Tab bar — mobile + tablet */}
      <nav
        className="fixed bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex w-[calc(100%-24px)] max-w-[520px] min-w-[280px] rounded-md border border-border bg-surface lg:hidden"
        role="tablist"
        style={{
          boxShadow: "0 4px 12px rgba(200, 147, 90, 0.08)",
        }}
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

      {/* Tab bar — desktop (top) */}
      <nav
        className="fixed top-4 left-1/2 -translate-x-1/2 z-20 hidden lg:flex rounded-md border border-border bg-surface/90 backdrop-blur-sm"
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
      className={`flex-1 py-3.5 px-6 font-mono text-[10px] uppercase tracking-widest transition-colors ${
        active
          ? "text-accent-secondary"
          : "text-foreground-secondary hover:text-foreground-muted"
      }`}
    >
      {label}
    </button>
  );
}

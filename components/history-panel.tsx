"use client";

import { useEffect, useState } from "react";
import { DitherArt } from "./dither-art";
import { historyRepo, type SessionEntry } from "@/lib/timer-store";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function HistoryPanel() {
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setEntries(historyRepo.getAll());
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") setEntries(historyRepo.getAll());
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return (
    <div className="w-full max-w-[520px]">
      {/* Header card */}
      <div
        className={`rounded-2xl border border-border bg-surface overflow-hidden transition-all duration-500 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <DitherArt />
        <div className="px-6 py-5 flex items-end justify-between">
          <div>
            <h2 className="text-[12px] tracking-[0.2em] text-foreground-secondary font-mono">
              {"// SESSION LOG"}
            </h2>
            <p className="text-[9px] tracking-[0.15em] text-foreground-muted mt-1 uppercase">
              Focus sessions completed
            </p>
          </div>
          <div className="flex items-center justify-center w-14 h-14 rounded-full border border-border bg-surface-muted">
            <span className="text-[22px] text-accent font-mono tabular-nums">
              {entries.length}
            </span>
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="mt-4 flex flex-col gap-2">
        {entries.length === 0 && (
          <div
            className={`flex flex-col items-center py-12 transition-all duration-500 delay-200 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <p className="text-[12px] tracking-[0.2em] text-foreground-secondary font-mono">
              {"// NO SESSIONS YET"}
            </p>
            <p className="text-[11px] tracking-wider text-foreground-muted mt-2">
              Complete one focus session to begin.
            </p>
          </div>
        )}

        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className={`flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 transition-all duration-300 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2.5"
            }`}
            style={{ transitionDelay: `${160 + index * 60}ms` }}
          >
            <div className="flex items-center gap-3.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-surface-muted">
                <span className="text-[10px] tracking-wider text-foreground-muted font-mono">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div>
                <span className="text-[11px] tracking-wider text-foreground font-mono">
                  {formatDate(entry.completedAtISO)}
                </span>
                <p className="text-[10px] tracking-wider text-foreground-muted mt-0.5">
                  started {formatTime(entry.startedAtISO)}
                </p>
              </div>
            </div>
            <div className="rounded-full border border-accent/20 bg-accent/8 px-3 py-1">
              <span className="text-[10px] tracking-wider text-accent font-mono">
                +1
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

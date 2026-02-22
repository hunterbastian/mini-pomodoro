"use client";

/* ─────────────────────────────────────────────────────────
 * HistoryPanel — Session log with staggered row entrance
 * ───────────────────────────────────────────────────────── */

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
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Re-sync when tab becomes visible
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        setEntries(historyRepo.getAll());
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return (
    <div className="w-full max-w-[650px]">
      {/* Header card */}
      <div
        className={`rounded-[10px] border border-border bg-surface overflow-hidden shadow-[0_8px_16px_rgba(200,147,90,0.06)] transition-all duration-500 ${
          visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-3"
        }`}
      >
        <DitherArt />
        <div className="px-6 py-4 flex items-end justify-between">
          <div>
            <h2 className="text-[13px] tracking-widest text-foreground-secondary font-mono">
              {"// SESSION LOG"}
            </h2>
            <p className="text-[9px] tracking-widest text-foreground-muted mt-1 uppercase">
              Focus sessions completed
            </p>
            {entries.length > 0 && (
              <p className="text-[10px] tracking-widest text-accent mt-1.5 uppercase">
                {entries.length} session{entries.length === 1 ? "" : "s"}{" "}
                complete
              </p>
            )}
          </div>
          {/* Session count badge */}
          <div className="flex items-center justify-center w-[60px] h-[60px] rounded-md border border-border bg-surface-muted">
            <span className="text-[24px] text-accent font-mono tabular-nums">
              {entries.length}
            </span>
          </div>
        </div>
      </div>

      {/* Session rows */}
      <div className="mt-4 flex flex-col gap-2.5">
        {entries.length === 0 && (
          <div
            className={`flex flex-col items-center py-10 transition-all duration-500 delay-200 ${
              visible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            }`}
          >
            <p className="text-[13px] tracking-widest text-foreground-secondary font-mono">
              {"// NO SESSIONS YET"}
            </p>
            <p className="text-[11px] tracking-wider text-foreground-muted mt-1.5">
              Complete one focus session to begin your journal.
            </p>
          </div>
        )}

        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className={`flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3.5 transition-all duration-300 ${
              visible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2.5"
            }`}
            style={{
              transitionDelay: `${160 + index * 60}ms`,
            }}
          >
            <div className="flex items-center gap-4">
              {/* Index badge */}
              <div className="flex items-center justify-center w-[34px] h-[34px] rounded-sm border border-border-subtle bg-surface-muted">
                <span className="text-[10px] tracking-wider text-foreground-muted font-mono">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-[5px] h-[5px] rounded-[2px] bg-accent opacity-70" />
                  <span className="text-[11px] tracking-wider text-foreground font-mono">
                    {formatDate(entry.completedAtISO)}
                  </span>
                </div>
                <p className="text-[10px] tracking-wider text-foreground-muted mt-0.5">
                  started {formatTime(entry.startedAtISO)}
                </p>
              </div>
            </div>

            {/* Session badge */}
            <div className="rounded-sm border border-accent/20 bg-accent/10 px-2.5 py-1.5">
              <span className="text-[10px] tracking-wider text-accent font-mono">
                +1 SESSION
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

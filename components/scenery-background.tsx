"use client";

/* ─────────────────────────────────────────────────────────
 * SceneryBackground — Ambient desert sky with twinkling stars
 *
 * Subtle CSS-only background layers: radial glows + star dots.
 * Much lighter than the SVG version for web perf.
 * ───────────────────────────────────────────────────────── */

export function SceneryBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Deep sky base */}
      <div className="absolute inset-0 bg-background" />

      {/* Warm ambient glow — top left */}
      <div
        className="absolute rounded-full animate-pulse-glow"
        style={{
          width: 500,
          height: 500,
          top: -180,
          left: -200,
          background:
            "radial-gradient(circle, rgba(200,147,90,0.05) 0%, transparent 70%)",
        }}
      />

      {/* Warm ambient glow — bottom right */}
      <div
        className="absolute rounded-full animate-pulse-glow"
        style={{
          width: 400,
          height: 400,
          bottom: -100,
          right: -160,
          background:
            "radial-gradient(circle, rgba(200,147,90,0.04) 0%, transparent 70%)",
          animationDelay: "2s",
        }}
      />

      {/* Green subtle glow — center */}
      <div
        className="absolute rounded-full"
        style={{
          width: 600,
          height: 600,
          top: "30%",
          left: "40%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(90,138,92,0.03) 0%, transparent 60%)",
        }}
      />

      {/* Star field */}
      {[
        { x: "8%", y: "6%", bright: true },
        { x: "22%", y: "3%", bright: false },
        { x: "35%", y: "12%", bright: true },
        { x: "48%", y: "5%", bright: false },
        { x: "62%", y: "9%", bright: true },
        { x: "75%", y: "4%", bright: false },
        { x: "88%", y: "7%", bright: true },
        { x: "15%", y: "18%", bright: false },
        { x: "42%", y: "15%", bright: false },
        { x: "68%", y: "20%", bright: true },
        { x: "92%", y: "14%", bright: false },
        { x: "5%", y: "28%", bright: false },
        { x: "30%", y: "25%", bright: true },
        { x: "55%", y: "22%", bright: false },
        { x: "78%", y: "30%", bright: false },
      ].map((star, i) => (
        <div
          key={i}
          className={star.bright ? "animate-signal-blink" : ""}
          style={{
            position: "absolute",
            left: star.x,
            top: star.y,
            width: star.bright ? 2 : 1.5,
            height: star.bright ? 2 : 1.5,
            borderRadius: "50%",
            backgroundColor: star.bright ? "#7a6e58" : "#3a3830",
            opacity: star.bright ? 0.7 : 0.4,
            animationDelay: `${i * 0.7}s`,
          }}
        />
      ))}

      {/* Horizon glow line */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: "8%",
          height: 1,
          background:
            "linear-gradient(90deg, transparent 5%, rgba(200,147,90,0.08) 30%, rgba(200,147,90,0.12) 50%, rgba(200,147,90,0.08) 70%, transparent 95%)",
        }}
      />
    </div>
  );
}

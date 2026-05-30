"use client";

import { useModeConfig } from "@/context/ModeContext";

function fmt(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Seven bars; heights and delays create a natural-looking waveform rhythm.
const BARS = [
  { h: 20, delay: "0ms" },
  { h: 32, delay: "80ms" },
  { h: 26, delay: "160ms" },
  { h: 38, delay: "240ms" },
  { h: 26, delay: "160ms" },
  { h: 32, delay: "80ms" },
  { h: 20, delay: "0ms" },
];

export default function RecordingScreen({
  isRecording,
  recordingSeconds,
  onStart,
  onStop,
}) {
  const config = useModeConfig();
  const IS_TRADE = config.appMode === "trade";
  const { colors } = config;
  // ── Idle: mic button with concentric rings ──────────────────────────────
  if (!isRecording) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center bg-[#111118] cursor-pointer select-none"
        onClick={onStart}
        role="button"
        aria-label="Start recording"
      >
        <div className="relative flex items-center justify-center w-72 h-72">
          {/* Concentric rings */}
          <div className="absolute inset-0 rounded-full border border-white/[0.04]" />
          <div className="absolute w-56 h-56 rounded-full border border-white/[0.06]" />
          <div className="absolute w-40 h-40 rounded-full border border-white/[0.09]" />

          {/* Mic button */}
          <button
            className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center text-[34px] text-white transition-transform active:scale-95 focus:outline-none"
            style={{
              background: colors.primary,
              boxShadow: `0 0 48px ${colors.primary}55`,
            }}
            tabIndex={-1}
          >
            🎙️
          </button>
        </div>

        <p className="mt-5 text-[13px] text-white/25 select-none">
          {IS_TRADE ? "Tap to log job" : "Tap to log"}
        </p>
      </div>
    );
  }

  // ── Active recording ────────────────────────────────────────────────────
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center bg-[#111118] cursor-pointer select-none px-8"
      onClick={onStop}
      role="button"
      aria-label="Stop recording"
    >
      {/* REC indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: "#E63946",
            animation: "recBlink 1s ease-in-out infinite",
          }}
        />
        <span className="text-[11px] font-mono uppercase tracking-widest text-white/30">
          Recording
        </span>
      </div>

      {/* Timer */}
      <div
        className="font-mono text-[58px] text-white leading-none mb-8 tabular-nums"
        style={{ letterSpacing: "-3px" }}
      >
        {fmt(recordingSeconds)}
      </div>

      {/* Waveform bars */}
      <div className="flex items-center gap-[5px] mb-8">
        {BARS.map(({ h, delay }, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full origin-bottom"
            style={{
              height: `${h}px`,
              background: colors.primary,
              animation: "waveBar 0.9s ease-in-out infinite",
              animationDelay: delay,
            }}
          />
        ))}
      </div>

      <p className="text-[11px] text-white/20 uppercase tracking-widest">
        Tap anywhere to stop
      </p>
    </div>
  );
}

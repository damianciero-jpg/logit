"use client";

import { useState } from "react";
import { useModeConfig } from "@/context/ModeContext";

// ─── UPGRADE SHEET ────────────────────────────────────────────────────────────
// Bottom sheet shown when the user hits the free limit (or taps the upgrade
// link). Captures email for the unlimited-tier waitlist via /api/waitlist.
// Renders inside the phone shell (parent must be position:relative).

function lsGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}

export default function UpgradeSheet({ onClose, usage, freeLimit }) {
  const config = useModeConfig();
  const { colors, upgrade } = config;

  const alreadyJoined = lsGet("logit_waitlist_email");
  const [email,  setEmail]  = useState("");
  const [status, setStatus] = useState(alreadyJoined ? "done" : "idle"); // idle | sending | done | error
  const [error,  setError]  = useState("");

  async function submit() {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, appMode: config.appMode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong.");
      }
      lsSet("logit_waitlist_email", trimmed);
      setStatus("done");
    } catch (e) {
      setStatus("idle");
      setError(e.message ?? "Couldn't save your email — try again.");
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative rounded-t-3xl bg-[#16161F] border-t border-x border-white/10 px-6 pt-5 pb-7">
        {/* Grab handle */}
        <div className="w-9 h-1 rounded-full bg-white/15 mx-auto mb-5" />

        {/* Usage context */}
        <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-2">
          {usage} of {freeLimit} free {config.appMode === "trade" ? "jobs" : "logs"} used
        </p>

        <h3 className="text-[19px] font-bold text-white leading-snug mb-1.5">
          {upgrade.headline}
        </h3>
        <p className="text-[13px] text-white/45 leading-relaxed mb-4">
          {upgrade.sub}
        </p>

        {/* Benefit bullets */}
        <div className="flex flex-col gap-2 mb-5">
          {upgrade.bullets.map((b) => (
            <div key={b} className="flex items-start gap-2.5">
              <span
                className="text-[12px] font-bold mt-px flex-shrink-0"
                style={{ color: colors.primary }}
              >
                ✓
              </span>
              <span className="text-[12px] text-white/60 leading-relaxed">{b}</span>
            </div>
          ))}
        </div>

        {/* Price anchor */}
        <div className="flex items-baseline gap-2 mb-5">
          <span className="text-[22px] font-bold text-white">{upgrade.price}</span>
          <span className="text-[11px] text-white/35">{upgrade.priceNote}</span>
        </div>

        {status === "done" ? (
          <div
            className="rounded-2xl px-4 py-4 text-center"
            style={{
              background: `${colors.primary}14`,
              border: `1px solid ${colors.primary}30`,
            }}
          >
            <p className="text-[13px] font-semibold text-white mb-0.5">
              You're on the list ✓
            </p>
            <p className="text-[11px] text-white/40">
              We'll email you the moment unlimited launches.
            </p>
          </div>
        ) : (
          <>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white text-[14px] placeholder:text-white/25 outline-none focus:border-white/25 transition-colors mb-2"
            />
            {error && (
              <p className="text-[11px] text-red-400 mb-2 px-1">{error}</p>
            )}
            <button
              onClick={submit}
              disabled={status === "sending"}
              className="w-full py-3.5 rounded-2xl font-bold text-[14px] text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
              style={{ background: colors.primary }}
            >
              {status === "sending" ? "Saving…" : upgrade.cta}
            </button>
            <p className="text-center text-[10px] text-white/25 mt-2.5 leading-relaxed">
              {upgrade.note}
            </p>
          </>
        )}

        {/* Dismiss */}
        <button
          onClick={onClose}
          className="w-full text-center text-[12px] text-white/30 hover:text-white/55 transition-colors pt-4"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

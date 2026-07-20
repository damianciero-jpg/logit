"use client";

import { useModeConfig } from "@/context/ModeContext";

export default function HomeScreen({
  logs,
  usage,
  freeLimit,
  district,
  onDistrictChange,
  onStartLogging,
  onModeToggle,
  onUpgradeTap,
}) {
  const config = useModeConfig();
  const IS_TRADE = config.appMode === "trade";
  const { colors, districts, howItWorksSteps, cats } = config;

  const lastLog = logs[0] ?? null;
  const usagePct = Math.min((usage / freeLimit) * 100, 100);
  const now = new Date();
  const daysLeft = Math.max(
    0,
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()
  );
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const jobsThisWeek = logs.filter((l) => new Date(l.createdAt) >= weekAgo).length;
  const atLimit = usage >= freeLimit;
  const hasLogs = logs.length > 0;

  // Theme shorthands
  const bg       = IS_TRADE ? "bg-[#111118]"       : "bg-slate-50";
  const border   = IS_TRADE ? "border-white/8"      : "border-slate-200";
  const textPri  = IS_TRADE ? "text-white"          : "text-gray-900";
  const textMute = IS_TRADE ? "text-white/40"       : "text-slate-500";
  const cardBg   = IS_TRADE ? "bg-white/4 border-white/8" : "bg-white border-slate-200";

  // ── Shared "How it works" block (reused verbatim in both layouts) ──────────
  const howItWorks = (
    <div className={`py-5 border-b ${border}`}>
      <p className={`text-[9px] font-mono uppercase tracking-widest mb-4 ${textMute}`}>
        How it works
      </p>
      <div className="flex flex-col gap-4">
        {howItWorksSteps.map(([title, sub], i) => (
          <div key={title} className="flex gap-3 items-start">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
              style={{ background: colors.primary }}
            >
              {i + 1}
            </div>
            <div>
              <p className={`text-[13px] font-semibold ${textPri}`}>{title}</p>
              <p className={`text-[11px] leading-relaxed mt-0.5 ${textMute}`}>{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Shared usage meter block (reused verbatim in both layouts) ─────────────
  const usageMeter = (
    <div className={`py-5 border-b ${border}`}>
      <div className="flex justify-between items-center mb-2">
        <span className={`text-[12px] ${textMute}`}>
          {IS_TRADE ? "Jobs this month" : "Logs this month"}
        </span>
        <span className={`text-[12px] font-mono ${textPri}`}>
          {usage} / {freeLimit}
        </span>
      </div>
      <div
        className={`h-1 rounded-full overflow-hidden ${
          IS_TRADE ? "bg-white/10" : "bg-slate-200"
        }`}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${usagePct}%`,
            background: atLimit ? "#E63946" : colors.primary,
          }}
        />
      </div>
      {atLimit ? (
        <button
          onClick={onUpgradeTap}
          className="text-[10px] mt-1.5 font-semibold underline underline-offset-2 text-left"
          style={{ color: colors.primary }}
        >
          Limit reached — get unlimited logs →
        </button>
      ) : (
        <p className={`text-[10px] mt-1.5 ${textMute}`}>
          {`Resets in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} · ${
            freeLimit - usage
          } remaining`}
        </p>
      )}
    </div>
  );

  // ── Shared last-log card (reused verbatim in both layouts) ─────────────────
  const lastLogCard = lastLog && (
    <div className={`py-5 border-b ${border}`}>
      <p className={`text-[9px] font-mono uppercase tracking-widest mb-2.5 ${textMute}`}>
        Most recent {IS_TRADE ? "job" : "log"}
      </p>
      <div className={`rounded-xl border p-3.5 ${cardBg}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: cats[lastLog.category]?.color ?? colors.primary }}
          >
            {cats[lastLog.category]?.label ?? lastLog.category}
          </span>
          <span className={`text-[10px] font-mono ${textMute}`}>
            {new Date(lastLog.createdAt).toLocaleDateString()}
          </span>
        </div>
        <p
          className={`text-[13px] leading-snug line-clamp-2 ${
            IS_TRADE ? "text-white/60" : "text-slate-600"
          }`}
        >
          {lastLog.summary}
        </p>
      </div>
    </div>
  );

  return (
    <div className={`flex-1 overflow-y-auto scrollbar-none ${bg}`}>
      <div className="px-6 pb-8">

        {IS_TRADE ? (
          <>
            {/* ── Hero (cold-link optimized: headline → subhead → example → CTA) ── */}
            <div className={`pt-6 pb-5 border-b ${border}`}>
              <p
                className="text-[10px] font-mono uppercase tracking-widest mb-2"
                style={{ color: colors.primary }}
              >
                {config.tagline}
              </p>
              <h2 className={`text-2xl font-bold leading-tight tracking-tight mb-2 ${textPri}`}>
                Talk for 30 seconds. Get a job report your customer can read.
              </h2>
              <p className={`text-[13px] leading-relaxed mb-5 ${textMute}`}>
                Hands-free job logging for field service pros.
              </p>

              {/* Before/after example — static demo content, not a live log */}
              <div className={`rounded-xl border p-3.5 mb-5 ${cardBg}`}>
                <p className={`text-[9px] font-mono uppercase tracking-widest mb-2.5 ${textMute}`}>
                  Example
                </p>
                <div className="mb-3">
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${textMute}`}>
                    🎤 You say:
                  </p>
                  <p className="text-[13px] leading-snug italic text-white/70">
                    "Replaced the flapper on the Johnsons' toilet, tested for leaks, no issues."
                  </p>
                </div>
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wide mb-1"
                    style={{ color: colors.primary }}
                  >
                    📋 You get:
                  </p>
                  <div className="flex flex-col gap-1">
                    <p className="text-[12px] leading-snug text-white/60">
                      <span className="font-semibold text-white/80">Client issue:</span>{" "}
                      Running toilet, suspected flapper failure
                    </p>
                    <p className="text-[12px] leading-snug text-white/60">
                      <span className="font-semibold text-white/80">Action taken:</span>{" "}
                      Replaced flapper, tested for leaks
                    </p>
                    <p className="text-[12px] leading-snug text-white/60">
                      <span className="font-semibold text-white/80">Next steps:</span>{" "}
                      None — issue resolved
                    </p>
                  </div>
                </div>
              </div>

              {/* Primary CTA — first opportunity, right below the fold */}
              <button
                onClick={onStartLogging}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-opacity hover:opacity-90 active:opacity-80"
                style={{ background: colors.primary }}
              >
                {config.ctaLabel}
              </button>
            </div>

            {/* ── How it works — moved up so it's the second thing on the page ── */}
            {howItWorks}

            {/* ── Usage meter — hidden until the first job is logged ── */}
            {usage > 0 && usageMeter}

            {/* ── Last log card ── */}
            {lastLogCard}

            {/* ── Quick stats + Truck shortcut — hidden for first-time visitors ── */}
            {hasLogs && (
              <div className={`py-4 border-b ${border}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[9px] font-mono uppercase tracking-widest ${textMute}`}>
                    This week
                  </span>
                  <span className={`text-[12px] font-mono ${textPri}`}>
                    {jobsThisWeek} job{jobsThisWeek !== 1 ? "s" : ""} logged
                  </span>
                </div>
                <div
                  className="rounded-xl px-3.5 py-2.5 flex items-center justify-between"
                  style={{ background: `${colors.primary}0d`, border: `1px solid ${colors.primary}22` }}
                >
                  <span className="text-[11px] text-white/45">
                    🚛 Mileage, fuel, or maintenance?
                  </span>
                  <span className="text-[10px] font-semibold" style={{ color: colors.primary }}>
                    Truck tab →
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* ── Hero ── */}
            <div className={`pt-6 pb-5 border-b ${border}`}>
              <p
                className="text-[10px] font-mono uppercase tracking-widest mb-2"
                style={{ color: colors.primary }}
              >
                {config.tagline}
              </p>
              <h2 className={`text-[17px] font-bold leading-snug tracking-tight mb-2 ${textPri}`}>
                Speak for 30 seconds. Get a FERPA-aware incident report.
              </h2>
              <p className={`text-[13px] leading-relaxed ${textMute}`}>
                Built to reduce after-hours paperwork for K–12 educators.
              </p>
            </div>

            {/* ── Usage meter ── */}
            {usageMeter}

            {/* ── Last log card ── */}
            {lastLogCard}

            {/* ── FERPA notice ── */}
            <div className="py-5 border-b border-slate-200">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🔒</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600">
                    FERPA Notice
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {[
                    "Use student codes — never full names in voice recordings",
                    "Logs are stored only on your device, never uploaded",
                    "Voice is processed by AI — do not include SSNs or sensitive PII",
                    "You are responsible for your district's data compliance",
                  ].map((item) => (
                    <li
                      key={item}
                      className="text-[11px] text-slate-500 leading-relaxed flex gap-2"
                    >
                      <span className="text-blue-300 flex-shrink-0 mt-px">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── District picker ── */}
            <div className={`py-5 border-b ${border}`}>
              <p className={`text-[9px] font-mono uppercase tracking-widest mb-3 ${textMute}`}>
                My District Form
              </p>
              <div className="flex flex-col gap-1.5">
                {districts.map((d) => {
                  const active = district === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => onDistrictChange(d.id)}
                      className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left w-full transition-all ${
                        active
                          ? "bg-blue-50 border-blue-300"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                      style={active ? { borderColor: colors.secondary } : {}}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm leading-none">{d.icon}</span>
                        <span
                          className={`text-[12px] ${
                            active
                              ? "text-blue-700 font-semibold"
                              : "text-gray-800 font-medium"
                          }`}
                        >
                          {d.label}
                        </span>
                        {d.state && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{
                              background: `${colors.secondary}22`,
                              color: colors.secondary,
                            }}
                          >
                            {d.state}
                          </span>
                        )}
                      </div>
                      {active && (
                        <span
                          className="text-[12px] font-bold"
                          style={{ color: colors.secondary }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className={`text-[10px] mt-2 ${textMute}`}>
                {district === "none"
                  ? "Select your district to auto-generate matching forms."
                  : `Forms will generate for ${districts.find((d) => d.id === district)?.label}.`}
              </p>
            </div>

            {/* ── How it works ── */}
            {howItWorks}
          </>
        )}

        {/* ── CTA (bottom) ── */}
        <div className="pt-5">
          <button
            onClick={onStartLogging}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-opacity hover:opacity-90 active:opacity-80"
            style={{ background: colors.primary }}
          >
            {config.ctaLabel}
          </button>
          {IS_TRADE && (
            <p className={`text-[10px] text-center mt-2 ${textMute}`}>
              Logs a job — vehicle &amp; mileage entries live in the Truck tab
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        <p className={`text-center text-[10px] leading-relaxed pt-4 ${textMute}`}>
          {config.appTitle} by {config.company} · {config.freeTierLabel}
          <br />
          {config.footerNote}
        </p>

        {/* ── Dev mode toggle ── */}
        {onModeToggle && (
          <div className="pt-2 pb-1 flex justify-center">
            <button
              onClick={onModeToggle}
              className={`text-[9px] font-mono px-3 py-1.5 rounded-full border transition-all ${
                IS_TRADE
                  ? "border-white/10 text-white/20 hover:text-white/45 hover:border-white/25"
                  : "border-slate-200 text-slate-300 hover:text-slate-500 hover:border-slate-300"
              }`}
            >
              ⌥ switch to {IS_TRADE ? "educator" : "trade"} mode
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

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
}) {
  const config = useModeConfig();
  const IS_TRADE = config.appMode === "trade";
  const { colors, districts, howItWorksSteps, cats } = config;

  const lastLog = logs[0] ?? null;
  const usagePct = Math.min((usage / freeLimit) * 100, 100);
  const daysLeft = 30 - new Date().getDate();
  const atLimit = usage >= freeLimit;

  // Theme shorthands
  const bg       = IS_TRADE ? "bg-[#111118]"       : "bg-slate-50";
  const border   = IS_TRADE ? "border-white/8"      : "border-slate-200";
  const textPri  = IS_TRADE ? "text-white"          : "text-gray-900";
  const textMute = IS_TRADE ? "text-white/40"       : "text-slate-500";
  const cardBg   = IS_TRADE ? "bg-white/4 border-white/8" : "bg-white border-slate-200";

  return (
    <div className={`flex-1 overflow-y-auto scrollbar-none ${bg}`}>
      <div className="px-6 pb-8">

        {/* ── Hero ── */}
        <div className={`pt-6 pb-5 border-b ${border}`}>
          <p
            className="text-[10px] font-mono uppercase tracking-widest mb-2"
            style={{ color: colors.primary }}
          >
            {appConfig.tagline}
          </p>
          <h2 className={`text-[17px] font-bold leading-snug tracking-tight mb-2 ${textPri}`}>
            {IS_TRADE
              ? "Speak the job. Get a professional report in seconds."
              : "Speak for 30 seconds. Get a FERPA-aware incident report."}
          </h2>
          <p className={`text-[13px] leading-relaxed ${textMute}`}>
            {IS_TRADE
              ? "Hands-free job logging for plumbers and field service techs."
              : "Built to reduce after-hours paperwork for K–12 educators."}
          </p>
        </div>

        {/* ── Usage meter ── */}
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
          <p className={`text-[10px] mt-1.5 ${textMute}`}>
            {atLimit
              ? "Limit reached — upgrade for unlimited logs"
              : `Resets in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} · ${
                  freeLimit - usage
                } remaining`}
          </p>
        </div>

        {/* ── Last log card ── */}
        {lastLog && (
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
        )}

        {/* ── FERPA notice — educator only ── */}
        {!IS_TRADE && (
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
        )}

        {/* ── Client privacy — trade only ── */}
        {IS_TRADE && (
          <div className={`py-5 border-b ${border}`}>
            <div
              className="rounded-xl p-4"
              style={{
                background: `${colors.primary}10`,
                border: `1px solid ${colors.primary}28`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🔒</span>
                <span
                  className="text-[10px] font-mono uppercase tracking-wider"
                  style={{ color: colors.primary }}
                >
                  Client Privacy
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Never include full client names or addresses in recordings. Use "the
                client" or general references. All job logs stored locally on this
                device.
              </p>
            </div>
          </div>
        )}

        {/* ── District / Region picker ── */}
        <div className={`py-5 border-b ${border}`}>
          <p className={`text-[9px] font-mono uppercase tracking-widest mb-3 ${textMute}`}>
            {IS_TRADE ? "Service Region" : "My District Form"}
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
                      ? IS_TRADE
                        ? "bg-white/6"
                        : "bg-blue-50 border-blue-300"
                      : IS_TRADE
                        ? "bg-transparent border-white/8 hover:bg-white/4"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                  style={active ? { borderColor: colors.secondary } : {}}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm leading-none">{d.icon}</span>
                    <span
                      className={`text-[12px] ${
                        active
                          ? IS_TRADE
                            ? "text-white font-semibold"
                            : "text-blue-700 font-semibold"
                          : IS_TRADE
                            ? "text-white/70 font-medium"
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
              ? IS_TRADE
                ? "Select your service region type."
                : "Select your district to auto-generate matching forms."
              : IS_TRADE
                ? `Logging as: ${districts.find((d) => d.id === district)?.label}`
                : `Forms will generate for ${
                    districts.find((d) => d.id === district)?.label
                  }.`}
          </p>
        </div>

        {/* ── How it works ── */}
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

        {/* ── CTA ── */}
        <div className="pt-5">
          <button
            onClick={onStartLogging}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-opacity hover:opacity-90 active:opacity-80"
            style={{ background: colors.primary }}
          >
            {config.ctaLabel}
          </button>
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

"use client";

import appConfig from "@/config/appConfig";

const { colors, cats, keywords, districts, features, howItWorksSteps, logFilters } = appConfig;

function suggestCategory(text) {
  const lower = text.toLowerCase();
  const scores = Object.entries(keywords).map(([cat, words]) => ({
    cat,
    score: words.reduce((n, w) => (lower.includes(w) ? n + 1 : n), 0),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 ? scores[0].cat : appConfig.defaultCategory;
}

function CatBadge({ catKey }) {
  const cat = cats[catKey];
  if (!cat) return null;
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: cat.bg, color: cat.color }}
    >
      {cat.label}
    </span>
  );
}

export default function Home() {
  const catEntries = Object.entries(cats);
  const primaryColor = colors.primary;
  const secondaryColor = colors.secondary;
  const mode = process.env.NEXT_PUBLIC_APP_MODE || "educator";

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: colors.appBg, color: "#ffffff" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-sm"
            style={{ background: primaryColor }}
          >
            {appConfig.appTitle[0]}
          </div>
          <div>
            <div className="font-bold text-base leading-tight">{appConfig.appTitle}</div>
            <div className="text-xs text-white/40">{appConfig.tagline}</div>
          </div>
        </div>
        <div
          className="text-xs font-mono px-3 py-1 rounded-full border"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)" }}
        >
          {mode} mode
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8 flex flex-col gap-10">

        {/* Hero */}
        <section className="flex flex-col gap-4">
          <div
            className="text-xs font-mono uppercase tracking-widest"
            style={{ color: primaryColor }}
          >
            {appConfig.tagline}
          </div>
          <h1 className="text-3xl font-bold leading-snug text-white">
            {appConfig.appTitle}
          </h1>
          <p className="text-sm leading-relaxed max-w-lg" style={{ color: "rgba(255,255,255,0.5)" }}>
            {appConfig.appDescription}
          </p>
          <button
            className="self-start mt-2 px-6 py-3 rounded-2xl font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ background: primaryColor, color: "#fff" }}
          >
            {appConfig.ctaLabel}
          </button>
        </section>

        {/* Features */}
        <section className="flex flex-col gap-4">
          <h2
            className="text-xs font-mono uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border p-5 flex flex-col gap-3"
                style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: f.bg }}
                >
                  {f.icon}
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">{f.title}</div>
                  <div className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {f.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="flex flex-col gap-4">
          <h2
            className="text-xs font-mono uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            How it works
          </h2>
          <div className="flex flex-col gap-4">
            {howItWorksSteps.map(([title, sub], i) => (
              <div key={title} className="flex gap-4 items-start">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                  style={{ background: primaryColor }}
                >
                  {i + 1}
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">{title}</div>
                  <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="flex flex-col gap-4">
          <h2
            className="text-xs font-mono uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Log Categories
          </h2>
          <div className="flex flex-wrap gap-2">
            {catEntries.map(([key]) => (
              <CatBadge key={key} catKey={key} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {logFilters.slice(1).map((f) => (
              <button
                key={f.id}
                className="px-3 py-1 rounded-full text-xs font-medium border"
                style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* Districts / Regions */}
        <section className="flex flex-col gap-4">
          <h2
            className="text-xs font-mono uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            {mode === "trade" ? "Service Regions" : "District Forms"}
          </h2>
          <div className="flex flex-col gap-2">
            {districts.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-xl border px-4 py-3"
                style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
              >
                <span className="text-base">{d.icon}</span>
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{d.label}</span>
                {d.state && (
                  <span
                    className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: secondaryColor + "22", color: secondaryColor }}
                  >
                    {d.state}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Active config preview */}
        <section className="flex flex-col gap-3">
          <h2
            className="text-xs font-mono uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Active Config
          </h2>
          <pre
            className="rounded-2xl border p-5 text-xs font-mono leading-relaxed overflow-x-auto"
            style={{
              borderColor: "rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.02)",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {JSON.stringify(
              {
                mode,
                title: appConfig.appTitle,
                categories: Object.keys(cats),
                districts: districts.map((d) => d.id),
                primaryColor: colors.primary,
                secondaryColor: colors.secondary,
              },
              null,
              2,
            )}
          </pre>
        </section>

      </div>

      {/* Footer */}
      <footer
        className="px-6 py-5 text-center text-xs border-t"
        style={{ borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.2)" }}
      >
        {appConfig.appTitle} by {appConfig.company} · {appConfig.freeTierLabel}
        <br />
        {appConfig.footerNote}
      </footer>
    </main>
  );
}

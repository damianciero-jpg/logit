"use client";

import { useState } from "react";
import appConfig from "@/config/appConfig";

const IS_TRADE = process.env.NEXT_PUBLIC_APP_MODE === "trade";
const { colors, cats, logFilters } = appConfig;

export default function LogsScreen({ logs, onDelete, onCopy }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = logs.filter((log) => {
    const matchesCat = filter === "all" || log.category === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      log.summary?.toLowerCase().includes(q) ||
      log.description?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#111118]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
        <h2 className="text-[18px] font-bold text-white">
          {IS_TRADE ? "Job History" : "Logs"}
        </h2>
        <span className="text-[11px] font-mono text-white/25">{logs.length} total</span>
      </div>

      {/* ── Search ── */}
      <div className="px-4 mb-2.5 flex-shrink-0">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-white/25 pointer-events-none select-none">
            🔍
          </span>
          <input
            className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/8 text-white text-[13px] placeholder:text-white/25 outline-none focus:border-white/20 focus:bg-white/[0.08] transition-all font-sans"
            placeholder={IS_TRADE ? "Search jobs…" : "Search logs…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div className="flex gap-1.5 px-4 mb-3 overflow-x-auto scrollbar-none flex-shrink-0 pb-1">
        {logFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all whitespace-nowrap ${
              filter === f.id
                ? "bg-white text-[#0A0F1E] border-white font-semibold"
                : "border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Log list / empty states ── */}
      {logs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-4xl mb-3 opacity-30">📋</div>
          <p className="text-[13px] text-white/20 leading-relaxed">
            {IS_TRADE
              ? "No jobs logged yet.\nTap Record to log your first job."
              : appConfig.emptyLogText}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-4xl mb-3 opacity-30">🔍</div>
          <p className="text-[13px] text-white/20 leading-relaxed">
            No matches found.
            <br />
            Try a different search or filter.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-none px-4 pb-4">
          {filtered.map((log) => {
            const c = cats[log.category];
            return (
              <div
                key={log.id}
                className="rounded-xl border border-white/[0.07] p-3.5 mb-2 hover:border-white/[0.14] transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: c?.color ?? colors.primary }}
                  >
                    {c?.label ?? log.category}
                  </span>
                  <span className="text-[10px] font-mono text-white/20">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-[13px] text-white/60 leading-snug line-clamp-2 mb-3">
                  {log.summary}
                </p>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onCopy(log)}
                    className="text-[11px] text-white/30 border border-white/10 rounded-lg px-2.5 py-1 hover:text-white/70 hover:border-white/25 transition-all font-sans"
                  >
                    {appConfig.copyPortalLabel}
                  </button>
                  <button
                    onClick={() => onDelete(log.id)}
                    className="text-[11px] text-white/20 hover:text-red-400 px-2 py-1 rounded transition-colors font-sans"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

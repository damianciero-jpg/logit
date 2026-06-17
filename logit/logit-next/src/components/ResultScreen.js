"use client";

import { useModeConfig } from "@/context/ModeContext";
import PhotoStrip from "@/components/PhotoStrip";

function fieldLabel(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Inline copy button ──────────────────────────────────────────────────────
function CopyBtn({ text, label = "Copy" }) {
  function copy() { navigator.clipboard?.writeText(text ?? ""); }
  return (
    <button
      onClick={copy}
      className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10 text-white/35 hover:text-white/70 hover:border-white/25 transition-all font-sans flex-shrink-0"
    >
      {label}
    </button>
  );
}

// ── Trade: quick-copy panel for one field ───────────────────────────────────
function TradeCopyPanel({ label, value, accent }) {
  return (
    <div
      className="rounded-xl border p-4 mb-2"
      style={{ borderColor: `${accent}28`, background: `${accent}0a` }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className="text-[9px] font-mono uppercase tracking-wider"
          style={{ color: accent }}
        >
          {label}
        </span>
        <CopyBtn text={value} />
      </div>
      <p className="text-[13px] leading-relaxed text-white/60">
        {value || <span className="text-white/20 italic">Not captured</span>}
      </p>
    </div>
  );
}

// ── Educator: collapsible district form section ─────────────────────────────
// districtForms passed as prop to avoid free-variable scoping bug
function DistrictForms({ result, districtForms }) {
  const sections = districtForms?.[result?.districtId] ?? [];
  if (!sections.length) return null;

  return (
    <div className="border-t border-white/6 pt-3 pb-1">
      {sections.map((section) => {
        const values = result?.[section.source] ?? {};
        const copyText = [
          section.title,
          ...section.fields.map((f) => `${fieldLabel(f)}: ${values[f] ?? ""}`),
        ].join("\n");

        return (
          <details key={section.source} className="group mb-0.5">
            <summary className="flex items-center justify-between py-2.5 cursor-pointer list-none">
              <span className="text-[9px] font-mono uppercase tracking-wider text-white/30 group-open:text-white/50 transition-colors">
                <span className="group-open:hidden mr-1">+</span>
                <span className="hidden group-open:inline mr-1">−</span>
                {section.title}
              </span>
              <CopyBtn text={copyText} />
            </summary>

            <div className="pb-3 flex flex-col gap-2">
              {section.fields.map((field) => (
                <div key={field}>
                  <div className="text-[8px] font-mono uppercase tracking-wider text-white/20 mb-1">
                    {fieldLabel(field)}
                  </div>
                  <textarea
                    className="w-full min-h-[34px] max-h-[100px] rounded-lg border border-white/8 bg-white/[0.03] text-white/55 font-sans text-[12px] leading-snug px-2.5 py-2 resize-y outline-none focus:border-white/20 focus:text-white/80 transition-colors"
                    rows={field === "details" || field === "narrative" ? 4 : 1}
                    value={values[field] ?? ""}
                    readOnly
                  />
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ResultScreen({
  result,
  onFieldChange,
  onCategoryChange,
  onSave,
  onDiscard,
  onCopy,
  onShare,
  photos,
  onAddPhoto,
  onRemovePhoto,
  aiError,
}) {
  const config = useModeConfig();
  const IS_TRADE = config.appMode === "trade";
  const {
    colors,
    cats,
    resultFields,
    districtForms,
    metadataField,
    tradeSummaryFields,
    customerShare,
  } = config;

  if (!result) return null;
  const cat = cats[result.category];

  // Resolve "primary"/"secondary" accent tokens to mode colors.
  const resolveAccent = (a) =>
    a === "primary" ? colors.primary : a === "secondary" ? colors.secondary : a;

  return (
    <div className="flex-1 flex flex-col bg-[#111118] overflow-hidden">

      {/* ── Category badge + summary ── */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold mb-3"
          style={{
            background: cat?.bg ?? `${colors.primary}20`,
            color: cat?.color ?? colors.primary,
          }}
        >
          {cat?.label ?? result.category}
        </span>
        <h3 className="text-[17px] font-medium text-white leading-snug">
          {result.summary}
        </h3>
      </div>

      {/* ── AI error banner ── */}
      {aiError && (
        <div className="mx-6 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-[11px] text-amber-300/90 leading-relaxed flex-shrink-0">
          ⚠ {aiError}
        </div>
      )}

      {/* ── Scrollable content ── */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-6"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.2) transparent" }}
      >

        {/* Typed job metadata — trade only, keeps identifiers out of audio */}
        {metadataField && (
          <div className="border-t border-white/6 py-3">
            <div className="text-[9px] font-mono uppercase tracking-wider text-white/25 mb-1.5">
              {metadataField.label}
            </div>
            <input
              type="text"
              className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 outline-none text-[13px] text-white/75 placeholder:text-white/20 font-sans focus:border-white/20 transition-colors"
              placeholder={metadataField.placeholder}
              value={result[metadataField.key] ?? ""}
              onChange={(e) => onFieldChange(metadataField.key, e.target.value)}
            />
          </div>
        )}

        {/* Trip notes — trade only, optional typed annotation for mileage/fuel cost */}
        {IS_TRADE && (
          <div className="border-t border-white/6 py-3">
            <div className="text-[9px] font-mono uppercase tracking-wider text-white/25 mb-1.5">
              Trip Notes (optional)
            </div>
            <input
              type="text"
              className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 outline-none text-[13px] text-white/75 placeholder:text-white/20 font-sans focus:border-white/20 transition-colors"
              placeholder="Mileage, fuel cost, tolls…"
              value={result.trip_notes ?? ""}
              onChange={(e) => onFieldChange("trip_notes", e.target.value)}
            />
          </div>
        )}

        {/* Photos — trade only (wired via props) */}
        {IS_TRADE && onAddPhoto && (
          <div className="border-t border-white/6 py-3">
            <div className="text-[9px] font-mono uppercase tracking-wider text-white/25 mb-2">
              Job Photos
            </div>
            <PhotoStrip
              photos={photos}
              onAdd={onAddPhoto}
              onRemove={onRemovePhoto}
              accent={colors.primary}
            />
            <p className="text-[9px] text-white/20 mt-1.5">
              Stored on this device only · before/after shots recommended
            </p>
          </div>
        )}

        {/* Standard editable fields */}
        {resultFields.map(({ label, key, rows }) => (
          <div key={key} className="border-t border-white/6 py-3">
            <div className="text-[9px] font-mono uppercase tracking-wider text-white/25 mb-1.5">
              {label}
            </div>
            <textarea
              className="w-full bg-transparent border-none outline-none text-[13px] text-white/65 leading-relaxed font-sans resize-none focus:text-white transition-colors"
              rows={rows}
              value={result[key] ?? ""}
              onChange={(e) => onFieldChange(key, e.target.value)}
            />
          </div>
        ))}

        {/* Category selector */}
        <div className="border-t border-white/6 py-3">
          <div className="text-[9px] font-mono uppercase tracking-wider text-white/25 mb-1.5">
            Category
          </div>
          <select
            className="w-full bg-transparent border-none outline-none text-[13px] text-white/65 font-sans cursor-pointer"
            value={result.category ?? config.defaultCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            {Object.entries(cats).map(([k, v]) => (
              <option key={k} value={k} className="bg-gray-900 text-white">
                {v.label}
              </option>
            ))}
          </select>
        </div>

        {/* Trade: quick-copy field panels (driven by config) */}
        {IS_TRADE && tradeSummaryFields && (
          <div className="border-t border-white/6 pt-4 pb-2">
            <div className="text-[9px] font-mono uppercase tracking-wider text-white/25 mb-3">
              Field Service Summary
            </div>
            {tradeSummaryFields.map(({ label, key, accent }) => (
              <TradeCopyPanel
                key={key}
                label={label}
                value={result[key] ?? ""}
                accent={resolveAccent(accent)}
              />
            ))}
          </div>
        )}

        {/* Educator: district form accordions */}
        {!IS_TRADE && (
          <DistrictForms result={result} districtForms={districtForms} />
        )}

      </div>

      {/* ── Privacy footer ── */}
      <p className="text-center text-[10px] text-white/15 py-2 px-6 flex-shrink-0">
        {config.privacyFooter}
      </p>

      {/* ── Copy for portal / Send to customer ── */}
      <div className="px-6 pb-1 flex-shrink-0 flex gap-2">
        <button
          onClick={onCopy}
          className="flex-1 py-3 rounded-2xl bg-white text-[#0A0A0F] font-bold text-[13px] hover:opacity-90 active:opacity-80 transition-opacity"
        >
          {config.copyPortalLabel}
        </button>
        {IS_TRADE && customerShare && onShare && (
          <button
            onClick={() => onShare(result)}
            className="flex-1 py-3 rounded-2xl font-bold text-[13px] text-white hover:opacity-90 active:opacity-80 transition-opacity"
            style={{ background: colors.secondary }}
          >
            {customerShare.buttonLabel}
          </button>
        )}
      </div>

      {/* ── Save / Discard ── */}
      <div className="px-6 pt-2 pb-5 flex gap-2.5 flex-shrink-0">
        <button
          onClick={onSave}
          className="flex-[2] py-3.5 rounded-2xl bg-white text-[#0A0A0F] font-semibold text-[14px] hover:opacity-90 active:opacity-80 transition-opacity"
        >
          Save Log
        </button>
        <button
          onClick={onDiscard}
          className="flex-1 py-3.5 rounded-2xl border border-white/10 text-white/35 text-[13px] hover:border-white/25 hover:text-white/60 transition-all"
        >
          Discard
        </button>
      </div>

    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useModeConfig } from "@/context/ModeContext";

// ─── VEHICLE LOG SCREEN ────────────────────────────────────────────────────────

const ENTRY_TYPES = [
  { id: "mileage",     label: "Mileage",      icon: "🛣️"  },
  { id: "fuel",        label: "Fuel",         icon: "⛽"  },
  { id: "maintenance", label: "Maintenance",  icon: "🔧"  },
];

function FieldRow({ label, children }) {
  return (
    <div className="border-t border-white/6 py-3">
      <div className="text-[9px] font-mono uppercase tracking-wider text-white/25 mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", inputMode }) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 outline-none text-[13px] text-white/75 placeholder:text-white/20 font-sans focus:border-white/20 focus:text-white transition-colors"
    />
  );
}

// ── Mic button ────────────────────────────────────────────────────────────────
function MicTrigger({ onStart, colors }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-10 cursor-pointer select-none"
      onClick={onStart}
    >
      <div className="relative flex items-center justify-center w-44 h-44 mb-4">
        <div className="absolute inset-0 rounded-full border border-white/[0.04]" />
        <div className="absolute w-32 h-32 rounded-full border border-white/[0.06]" />
        <div className="absolute w-24 h-24 rounded-full border border-white/[0.09]" />
        <button
          className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-[22px] text-white transition-transform active:scale-95 focus:outline-none"
          style={{
            background: colors.primary,
            boxShadow: `0 0 32px ${colors.primary}55`,
          }}
          tabIndex={-1}
        >
          🎙️
        </button>
      </div>
      <p className="text-[13px] text-white/45">Tap to speak your vehicle log</p>
      <p className="text-[11px] text-white/30 mt-1">or fill the form below</p>
    </div>
  );
}

// ── Active recording mini-bar ─────────────────────────────────────────────────
function RecordingBar({ seconds, onStop, colors }) {
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return (
    <div
      className="mx-6 mb-4 rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer"
      style={{ background: `${colors.primary}18`, border: `1px solid ${colors.primary}35` }}
      onClick={onStop}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: "#E63946", animation: "recBlink 1s ease-in-out infinite" }}
        />
        <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest">
          Recording
        </span>
      </div>
      <span className="text-[13px] font-mono text-white/70 tabular-nums">
        {fmt(seconds)}
      </span>
      <span className="text-[11px] text-white/30">Tap to stop</span>
    </div>
  );
}

// ── This Week stats row ───────────────────────────────────────────────────────
function WeekStats({ vehicleLogs, colors, onSelectType }) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const counts = { mileage: 0, fuel: 0, maintenance: 0 };
  vehicleLogs.forEach((l) => {
    if (new Date(l.createdAt) >= weekAgo && counts[l.type] !== undefined) {
      counts[l.type]++;
    }
  });
  return (
    <div className="px-6 pb-4 flex-shrink-0 border-b border-white/6">
      <p className="text-[9px] font-mono uppercase tracking-widest text-white/25 mb-2">
        This week
      </p>
      <div className="flex gap-2">
        {ENTRY_TYPES.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => onSelectType(id)}
            className="flex-1 flex flex-col items-center py-2 rounded-xl border border-white/8 active:opacity-80 active:scale-95 transition-all cursor-pointer"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <span className="text-[13px] leading-none mb-0.5">{icon}</span>
            <span className="text-[11px] font-mono tabular-nums" style={{ color: colors.primary }}>
              {counts[id]}
            </span>
            <span className="text-[9px] text-white/30 mt-0.5">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VehicleLogScreen({
  vehicleLogs,
  isRecording,
  recordingSeconds,
  onStartRecording,
  onStopRecording,
  aiDraft,
  onClearDraft,
  onSaveVehicleLog,
  onDeleteVehicleLog,
  showToast,
}) {
  const config = useModeConfig();
  const { colors } = config;

  // Form state
  const [type,      setType]      = useState("mileage");
  const [vehicle,   setVehicle]   = useState("");
  const [date,      setDate]      = useState(new Date().toISOString().slice(0, 10));
  const [odomIn,    setOdomIn]    = useState("");
  const [odomOut,   setOdomOut]   = useState("");
  const [purpose,   setPurpose]   = useState("");
  const [gallons,   setGallons]   = useState("");
  const [fuelCost,  setFuelCost]  = useState("");
  const [station,   setStation]   = useState("");
  const [workDone,  setWorkDone]  = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [shopName,  setShopName]  = useState("");
  const [notes,     setNotes]     = useState("");

  // UI state
  const [view, setView] = useState("form");

  // ── Sync form fields when AI draft arrives asynchronously (1f fix) ─────────
  useEffect(() => {
    if (!aiDraft) return;
    setType(aiDraft.type      ?? "mileage");
    setVehicle(aiDraft.vehicle ?? "");
    if (aiDraft.date) setDate(aiDraft.date);
    setOdomIn(aiDraft.odometer_start ?? "");
    setOdomOut(aiDraft.odometer_end  ?? "");
    setPurpose(aiDraft.purpose       ?? "");
    setGallons(aiDraft.gallons       ?? "");
    setFuelCost(aiDraft.fuel_cost    ?? "");
    setStation(aiDraft.station       ?? "");
    setWorkDone(aiDraft.work_done    ?? "");
    setPartsCost(aiDraft.parts_cost  ?? "");
    setLaborCost(aiDraft.labor_cost  ?? "");
    setShopName(aiDraft.shop_name    ?? "");
    setNotes(aiDraft.notes           ?? "");
    setView("form");
  }, [aiDraft]);

  // Tapping a This Week stat chip selects the type and shows the form.
  function handleSelectType(t) {
    setType(t);
    setView("form");
  }

  const miles =
    odomIn && odomOut && Number(odomOut) > Number(odomIn)
      ? (Number(odomOut) - Number(odomIn)).toFixed(1)
      : null;

  function resetForm() {
    setType("mileage"); setVehicle(""); setDate(new Date().toISOString().slice(0, 10));
    setOdomIn(""); setOdomOut(""); setPurpose("");
    setGallons(""); setFuelCost(""); setStation("");
    setWorkDone(""); setPartsCost(""); setLaborCost(""); setShopName(""); setNotes("");
    onClearDraft?.();
  }

  function handleSave() {
    const entry = {
      id: Date.now().toString(),
      type,
      vehicle: vehicle.trim() || "Truck",
      date,
      createdAt: new Date().toISOString(),
      odometer_start: odomIn    || null,
      odometer_end:   odomOut   || null,
      miles:          miles     || null,
      purpose:        purpose   || null,
      gallons:        gallons   || null,
      fuel_cost:      fuelCost  || null,
      station:        station   || null,
      work_done:      workDone  || null,
      parts_cost:     partsCost || null,
      labor_cost:     laborCost || null,
      shop_name:      shopName  || null,
      notes:          notes     || null,
    };

    const hasData =
      (type === "mileage"     && (odomIn || odomOut || purpose)) ||
      (type === "fuel"        && (gallons || fuelCost)) ||
      (type === "maintenance" && workDone);

    if (!hasData) {
      showToast("Add at least one field before saving.");
      return;
    }

    onSaveVehicleLog(entry);
    resetForm();
    showToast("✓ Vehicle log saved");
  }

  function buildExportText(log) {
    const typeLabel = ENTRY_TYPES.find((t) => t.id === log.type)?.label ?? log.type;
    const lines = [
      `VEHICLE LOG — ${typeLabel.toUpperCase()}`,
      "─".repeat(36),
      `Vehicle:  ${log.vehicle}`,
      `Date:     ${log.date}`,
      "",
    ];
    if (log.type === "mileage") {
      if (log.odometer_start) lines.push(`Odometer start: ${log.odometer_start}`);
      if (log.odometer_end)   lines.push(`Odometer end:   ${log.odometer_end}`);
      if (log.miles)          lines.push(`Miles driven:   ${log.miles}`);
      if (log.purpose)        lines.push(`Purpose: ${log.purpose}`);
    }
    if (log.type === "fuel") {
      if (log.gallons)   lines.push(`Gallons:  ${log.gallons}`);
      if (log.fuel_cost) lines.push(`Cost:     $${log.fuel_cost}`);
      if (log.station)   lines.push(`Station:  ${log.station}`);
    }
    if (log.type === "maintenance") {
      if (log.work_done)   lines.push(`Work done: ${log.work_done}`);
      if (log.parts_cost)  lines.push(`Parts:     $${log.parts_cost}`);
      if (log.labor_cost)  lines.push(`Labor:     $${log.labor_cost}`);
      if (log.shop_name)   lines.push(`Shop:      ${log.shop_name}`);
      if (log.notes)       lines.push(`Notes: ${log.notes}`);
    }
    lines.push("─".repeat(36), "Generated by ServiceLog · CieroLink LLC");
    return lines.join("\n");
  }

  function copyLog(log) {
    navigator.clipboard?.writeText(buildExportText(log));
    showToast("✓ Copied");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#111118]">

      {/* ── Header + view toggle ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
        <h2 className="text-[18px] font-bold text-white">Vehicle Log</h2>
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          {["form", "history"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 text-[11px] font-medium capitalize transition-colors"
              style={
                view === v
                  ? { background: colors.primary, color: "#fff" }
                  : { color: "rgba(255,255,255,0.35)" }
              }
            >
              {v === "form" ? "Log" : `History (${vehicleLogs.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── This Week stats (always visible) ── */}
      <WeekStats vehicleLogs={vehicleLogs} colors={colors} onSelectType={handleSelectType} />

      {/* ══ FORM VIEW ══════════════════════════════════════════════════════════ */}
      {view === "form" && (
        <div className="flex-1 overflow-y-auto px-6 pb-6" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}>

          {/* Voice trigger / recording bar */}
          {isRecording ? (
            <RecordingBar seconds={recordingSeconds} onStop={onStopRecording} colors={colors} />
          ) : (
            <MicTrigger onStart={onStartRecording} colors={colors} />
          )}

          {/* AI draft banner */}
          {aiDraft && (
            <div
              className="rounded-xl px-4 py-3 mb-2 flex items-center justify-between"
              style={{ background: `${colors.primary}14`, border: `1px solid ${colors.primary}30` }}
            >
              <span className="text-[11px] text-white/60">
                ✓ Fields pre-filled from your recording
              </span>
              <button onClick={resetForm} className="text-[10px] text-white/35 hover:text-white/60 transition-colors">
                Clear
              </button>
            </div>
          )}

          {/* Entry type pills */}
          <FieldRow label="Log Type">
            <div className="flex gap-2">
              {ENTRY_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className="flex-1 py-2 rounded-xl border text-[12px] font-medium transition-all"
                  style={
                    type === t.id
                      ? { borderColor: colors.primary, background: `${colors.primary}18`, color: colors.primary }
                      : { borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }
                  }
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </FieldRow>

          {/* Vehicle + date — always shown */}
          <FieldRow label="Vehicle">
            <TextInput value={vehicle} onChange={setVehicle} placeholder="Truck 1, White F-250, Van…" />
          </FieldRow>

          <FieldRow label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 outline-none text-[13px] text-white/75 font-sans focus:border-white/20 transition-colors"
              style={{ colorScheme: "dark" }}
            />
          </FieldRow>

          {/* ── Mileage fields ── */}
          {type === "mileage" && (
            <>
              <FieldRow label="Odometer Start">
                <TextInput value={odomIn} onChange={setOdomIn} placeholder="e.g. 48230" inputMode="decimal" />
              </FieldRow>
              <FieldRow label="Odometer End">
                <div className="space-y-1">
                  <TextInput value={odomOut} onChange={setOdomOut} placeholder="e.g. 48412" inputMode="decimal" />
                  {miles && (
                    <p className="text-[11px] px-1" style={{ color: colors.primary }}>
                      {miles} miles driven
                    </p>
                  )}
                </div>
              </FieldRow>
              <FieldRow label="Purpose / Job">
                <TextInput value={purpose} onChange={setPurpose} placeholder="Customer job, supply run, shop…" />
              </FieldRow>
            </>
          )}

          {/* ── Fuel fields ── */}
          {type === "fuel" && (
            <>
              <FieldRow label="Gallons">
                <TextInput value={gallons} onChange={setGallons} placeholder="e.g. 18.4" inputMode="decimal" />
              </FieldRow>
              <FieldRow label="Total Cost ($)">
                <TextInput value={fuelCost} onChange={setFuelCost} placeholder="e.g. 72.50" inputMode="decimal" />
              </FieldRow>
              <FieldRow label="Station (optional)">
                <TextInput value={station} onChange={setStation} placeholder="Wawa, Sunoco, Shell…" />
              </FieldRow>
            </>
          )}

          {/* ── Maintenance fields ── */}
          {type === "maintenance" && (
            <>
              <FieldRow label="Work Done">
                <textarea
                  className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 outline-none text-[13px] text-white/75 placeholder:text-white/20 font-sans focus:border-white/20 transition-colors resize-none"
                  rows={3}
                  placeholder="Oil change, brake pads, tire rotation…"
                  value={workDone}
                  onChange={(e) => setWorkDone(e.target.value)}
                />
              </FieldRow>
              <FieldRow label="Parts Cost ($)">
                <TextInput value={partsCost} onChange={setPartsCost} placeholder="e.g. 45.00" inputMode="decimal" />
              </FieldRow>
              <FieldRow label="Labor Cost ($)">
                <TextInput value={laborCost} onChange={setLaborCost} placeholder="e.g. 120.00" inputMode="decimal" />
              </FieldRow>
              <FieldRow label="Shop / Done By">
                <TextInput value={shopName} onChange={setShopName} placeholder="Jiffy Lube, self, Joe's Auto…" />
              </FieldRow>
              <FieldRow label="Notes (optional)">
                <TextInput value={notes} onChange={setNotes} placeholder="Next oil change at 52,000 miles…" />
              </FieldRow>
            </>
          )}

          <div className="pt-5">
            <button
              onClick={handleSave}
              className="w-full py-3.5 rounded-2xl font-bold text-[14px] text-white transition-opacity hover:opacity-90 active:opacity-80"
              style={{ background: colors.primary }}
            >
              Save Vehicle Log
            </button>
          </div>

        </div>
      )}

      {/* ══ HISTORY VIEW ═══════════════════════════════════════════════════════ */}
      {view === "history" && (
        <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}>
          {vehicleLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl mb-3 opacity-30">🚛</div>
              <p className="text-[13px] text-white/20 leading-relaxed">
                No vehicle logs yet.
                <br />
                Tap Log to add your first entry.
              </p>
            </div>
          ) : (
            vehicleLogs.map((log) => {
              const t = ENTRY_TYPES.find((x) => x.id === log.type);
              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-white/[0.07] p-3.5 mb-2 hover:border-white/[0.14] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] leading-none">{t?.icon}</span>
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: colors.primary }}
                      >
                        {t?.label ?? log.type}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40">
                        {log.vehicle}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-white/20">{log.date}</span>
                  </div>

                  <p className="text-[12px] text-white/55 leading-snug mb-3">
                    {log.type === "mileage" && log.miles
                      ? `${log.miles} mi${log.purpose ? ` · ${log.purpose}` : ""}`
                      : log.type === "fuel" && log.gallons
                      ? `${log.gallons} gal${log.fuel_cost ? ` · $${log.fuel_cost}` : ""}${log.station ? ` · ${log.station}` : ""}`
                      : log.type === "maintenance" && log.work_done
                      ? log.work_done
                      : "—"}
                  </p>

                  {(log.parts_cost || log.labor_cost || log.fuel_cost) && (
                    <div className="flex gap-1.5 mb-3">
                      {log.fuel_cost && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-white/40">
                          fuel ${log.fuel_cost}
                        </span>
                      )}
                      {log.parts_cost && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-white/40">
                          parts ${log.parts_cost}
                        </span>
                      )}
                      {log.labor_cost && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-white/40">
                          labor ${log.labor_cost}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => copyLog(log)}
                      className="text-[11px] text-white/30 border border-white/10 rounded-lg px-2.5 py-1 hover:text-white/70 hover:border-white/25 transition-all font-sans"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => onDeleteVehicleLog(log.id)}
                      className="text-[11px] text-white/20 hover:text-red-400 px-2 py-1 rounded transition-colors font-sans"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
}

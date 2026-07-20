"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { configs } from "@/config/appConfig";
import { ModeContext, useModeConfig } from "@/context/ModeContext";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import HomeScreen from "@/components/HomeScreen";
import RecordingScreen from "@/components/RecordingScreen";
import ResultScreen from "@/components/ResultScreen";
import LogsScreen from "@/components/LogsScreen";
import VehicleLogScreen from "@/components/VehicleLogScreen";
import UpgradeSheet from "@/components/UpgradeSheet";
import {
  addPhotos,
  getPhotos,
  getPhotoCounts,
  deletePhotosForLog,
  compressImage,
} from "@/lib/photoStore";

const BUILD_MODE = process.env.NEXT_PUBLIC_APP_MODE || "trade";
const IS_DEV     = process.env.NODE_ENV === "development";

// ── localStorage helpers ─────────────────────────────────────────────────────
function lsGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v !== null ? v : fallback; }
  catch { return fallback; }
}
function lsSet(key, val) { try { localStorage.setItem(key, String(val)); } catch {} }

// ── Status bar ───────────────────────────────────────────────────────────────
function StatusBar({ isDark, usage }) {
  const config = useModeConfig();
  return (
    <div
      className={`flex items-center justify-between px-5 pt-4 pb-1 flex-shrink-0 transition-colors duration-300 ${
        isDark ? "bg-[#111118]" : "bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-[7px] flex items-center justify-center font-bold text-white text-xs"
          style={{ background: config.colors.primary }}
        >
          {config.appTitle[0]}
        </div>
        <span className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
          {config.appTitle}
        </span>
      </div>
      <span className={`text-[11px] font-mono ${isDark ? "text-white/25" : "text-slate-400"}`}>
        {usage} / {config.freeLimit}
      </span>
    </div>
  );
}

// ── Tab bar ──────────────────────────────────────────────────────────────────
function TabBar({ activeTab, isDark, tabs, onTabChange }) {
  const { colors } = useModeConfig();
  return (
    <div
      className={`flex flex-shrink-0 transition-colors duration-300 ${
        isDark
          ? "border-t border-white/8 bg-[#111118]"
          : "border-t border-slate-200 bg-white"
      }`}
    >
      {tabs.map((t) => {
        const active = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className="flex-1 flex flex-col items-center justify-center py-2.5 pb-4 gap-1 cursor-pointer bg-transparent border-none"
          >
            <span className="text-xl leading-none" style={{ opacity: active ? 1 : 0.35 }}>
              {t.icon}
            </span>
            <span
              className="text-[10px] font-medium tracking-wide"
              style={{
                color: isDark
                  ? active ? "white" : "rgba(255,255,255,0.3)"
                  : active ? colors.secondary : "#8899BB",
              }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Processing spinner ────────────────────────────────────────────────────────
function ProcessingOverlay() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#111118]">
      <div className="w-9 h-9 rounded-full border-[1.5px] border-white/10 border-t-white/60 animate-spin" />
      <p className="text-[13px] text-white/30">Formatting your report…</p>
      <p className="text-[10px] text-white/15">Usually 3–5 seconds</p>
    </div>
  );
}

// ── Inner app — uses useSearchParams so it must be inside <Suspense> ─────────
function AppShell() {
  const searchParams = useSearchParams();

  // Resolve runtime mode: ?mode= query param > build-time env default.
  // Validated against known modes so arbitrary query values are ignored.
  const queryMode = searchParams.get("mode");
  const resolvedDefault =
    queryMode === "trade" || queryMode === "educator" ? queryMode : BUILD_MODE;

  const [activeMode, setActiveMode] = useState(resolvedDefault);
  const activeConfig = configs[activeMode] ?? configs.trade;
  const IS_TRADE = activeMode === "trade";

  // Tabs are mode-dependent so derived here, not at module level.
  const TABS = [
    { id: "home",    icon: "🏠",  label: "Home" },
    { id: "record",  icon: "🎙️", label: IS_TRADE ? "Log Job" : "Record" },
    { id: "logs",    icon: "📋",  label: IS_TRADE ? "Jobs" : "Logs" },
    ...(IS_TRADE ? [{ id: "vehicle", icon: "🚛", label: "Truck" }] : []),
  ];

  // ── Hydration guard ──
  const [mounted,  setMounted]  = useState(false);

  // ── Persistent state ──
  const [logs,        setLogs]        = useState([]);
  const [vehicleLogs, setVehicleLogs] = useState([]);
  const [usage,       setUsage]       = useState(0);
  const [district,    setDistrict]    = useState("none");

  // ── Session state ──
  const [tab,            setTab]            = useState("home");
  const [phase,          setPhase]          = useState("idle");
  const [edited,         setEdited]         = useState(null);
  const [aiError,        setAiError]        = useState("");
  const [toast,          setToast]          = useState("");
  const [recordingFor,   setRecordingFor]   = useState("job"); // "job" | "vehicle"
  const [vehicleAiDraft, setVehicleAiDraft] = useState(null);
  const [vehiclePhase,   setVehiclePhase]   = useState("idle"); // "idle" | "processing"

  // ── Photos (staged before save, then persisted to IndexedDB) ───────────────
  const [pendingPhotos, setPendingPhotos] = useState([]); // [{ id, blob, url }]
  const [photoCounts,   setPhotoCounts]   = useState({}); // { logId: count }

  // ── Upgrade sheet (shown when the free limit blocks recording) ─────────────
  const [showUpgrade, setShowUpgrade] = useState(false);

  const recorder = useMediaRecorder();

  function refreshPhotoCounts() {
    getPhotoCounts().then(setPhotoCounts).catch(() => {});
  }

  // ── Mount: hydrate from localStorage ──────────────────────────────────────
  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const savedMonth   = lsGet("logit_usage_month");
    let resolvedUsage = 0;
    if (savedMonth !== currentMonth) {
      lsSet("logit_usage_month", currentMonth);
      lsSet("logit_monthly_usage", "0");
      setUsage(0);
    } else {
      resolvedUsage = parseInt(lsGet("logit_monthly_usage", "0"), 10);
      setUsage(resolvedUsage);
    }
    try { setLogs(JSON.parse(lsGet("logit_logs", "[]"))); } catch { setLogs([]); }
    try { setVehicleLogs(JSON.parse(lsGet("logit_vehicle_logs", "[]"))); } catch { setVehicleLogs([]); }
    setDistrict(lsGet("logit_district", "none"));
    refreshPhotoCounts();

    // PWA shortcut / deep-link tab (e.g. ?tab=record from the manifest shortcut).
    const queryTab  = searchParams.get("tab");
    const validTabs = ["home", "record", "logs", ...(IS_TRADE ? ["vehicle"] : [])];
    if (validTabs.includes(queryTab)) {
      if (queryTab === "record") {
        if (resolvedUsage < activeConfig.freeLimit) {
          setRecordingFor("job");
          setTab("record");
        }
      } else {
        setTab(queryTab);
      }
    }

    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Send audio blob to the appropriate pipeline when recording finishes ──────
  useEffect(() => {
    if (!recorder.audioBlob) return;
    if (recordingFor === "vehicle") processVehicleAudio(recorder.audioBlob);
    else processAudio(recorder.audioBlob);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.audioBlob]);

  // ── Whisper (Groq) + Claude pipeline ─────────────────────────────────────
  async function processAudio(blob) {
    setPhase("processing");
    setAiError("");

    const ext = blob.type?.includes("mp4") ? "mp4" : blob.type?.includes("ogg") ? "ogg" : "webm";
    const fd = new FormData();
    fd.append("audio", blob, `recording.${ext}`);
    fd.append("appMode", activeMode);
    fd.append("districtId", district);

    try {
      const res  = await fetch("/api/format-report", { method: "POST", body: fd });
      const data = await res.json();

      if (data.error && !data.summary) {
        showToast("Processing failed — please try again.");
        setPhase("idle");
        return;
      }
      if (data.aiError) {
        setAiError("AI used fallback formatting. Edit the fields below as needed.");
      }

      setEdited({ ...data });
      setPhase("result");
    } catch {
      showToast("Network error — please try again.");
      setPhase("idle");
    }
  }

  // ── Vehicle-log voice pipeline ────────────────────────────────────────────
  async function processVehicleAudio(blob) {
    setVehiclePhase("processing");
    const ext = blob.type?.includes("mp4") ? "mp4" : blob.type?.includes("ogg") ? "ogg" : "webm";
    const fd = new FormData();
    fd.append("audio", blob, `recording.${ext}`);
    try {
      const res  = await fetch("/api/vehicle-log", { method: "POST", body: fd });
      const data = await res.json();
      console.log("[vehicle-log] response status:", res.status, "body:", data);
      if (data.error || data.aiError) {
        showToast("Couldn't auto-fill — fill the form manually.");
      } else {
        setVehicleAiDraft(data);
      }
    } catch (err) {
      console.error("[vehicle-log] client fetch error:", err);
      showToast("Network error — fill the form manually.");
    }
    setVehiclePhase("idle");
  }

  function saveVehicleLog(entry) {
    const updated = [entry, ...vehicleLogs];
    setVehicleLogs(updated);
    lsSet("logit_vehicle_logs", JSON.stringify(updated));
  }

  function deleteVehicleLog(id) {
    const updated = vehicleLogs.filter((l) => l.id !== id);
    setVehicleLogs(updated);
    lsSet("logit_vehicle_logs", JSON.stringify(updated));
    showToast("Entry deleted");
  }

  // ── Save log ───────────────────────────────────────────────────────────────
  function saveLog() {
    if (!edited) return;
    const entry = {
      id:       Date.now().toString(),
      category: edited.category  ?? activeConfig.defaultCategory,
      summary:  edited.summary   ?? "",
      description:      edited.description  ?? "",
      action_taken:     edited.action_taken ?? "",
      follow_up:        edited.follow_up    ?? "",
      districtId:       edited.districtId   ?? district,
      behavior_referral: edited.behavior_referral ?? null,
      osr5_statement:    edited.osr5_statement    ?? null,
      district_report:   edited.district_report   ?? null,
      nj_report:         edited.nj_report         ?? null,
      pa_report:         edited.pa_report         ?? null,
      client_issue:           edited.client_issue           ?? null,
      diagnostic_findings:    edited.diagnostic_findings    ?? null,
      materials_used:         edited.materials_used         ?? null,
      recommended_next_steps: edited.recommended_next_steps ?? null,
      job_ref:                edited.job_ref                ?? null,
      trip_notes:             edited.trip_notes              ?? null,
      createdAt: new Date().toISOString(),
    };
    const updated = [entry, ...logs];
    setLogs(updated);
    lsSet("logit_logs", JSON.stringify(updated));
    const nextUsage = usage + 1;
    setUsage(nextUsage);
    lsSet("logit_monthly_usage", String(nextUsage));

    if (pendingPhotos.length) {
      addPhotos(entry.id, pendingPhotos.map((p) => p.blob))
        .then(refreshPhotoCounts)
        .catch(() => {});
    }

    discard();
    setTab("home");
    showToast("✓ Log saved");
  }

  function discard() {
    setPhase("idle");
    setEdited(null);
    setAiError("");
    pendingPhotos.forEach((p) => URL.revokeObjectURL(p.url));
    setPendingPhotos([]);
  }

  function deleteLog(id) {
    const updated = logs.filter((l) => l.id !== id);
    setLogs(updated);
    lsSet("logit_logs", JSON.stringify(updated));
    deletePhotosForLog(id).then(refreshPhotoCounts).catch(() => {});
    showToast("Log deleted");
  }

  // ── Photo staging (before save) ─────────────────────────────────────────────
  async function handleAddPhoto(fileList) {
    const files = Array.from(fileList ?? []);
    const staged = await Promise.all(
      files.map(async (file) => {
        const blob = await compressImage(file);
        return {
          id: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          blob,
          url: URL.createObjectURL(blob),
        };
      })
    );
    setPendingPhotos((prev) => [...prev, ...staged]);
  }

  function handleRemovePhoto(id) {
    setPendingPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function loadPhotosForLog(logId) {
    try {
      return await getPhotos(logId);
    } catch {
      return [];
    }
  }

  // ── Customer share (trade mode) ─────────────────────────────────────────────
  function handleShare(log) {
    const cs = activeConfig.customerShare;
    if (!cs) return;
    const text = [
      cs.intro,
      "",
      cs.foundLabel,
      log.client_issue ?? "",
      "",
      cs.didLabel,
      log.action_taken ?? "",
      "",
      cs.nextLabel,
      log.recommended_next_steps || log.follow_up || "",
      "",
      cs.signoff,
    ].join("\n");

    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      showToast("✓ Copied — paste into your text or email");
    }
  }

  // ── Copy text builder ──────────────────────────────────────────────────────
  function buildCopyText(log) {
    const catLabel = activeConfig.cats[log.category]?.label ?? log.category;
    const date     = new Date(log.createdAt).toLocaleString();

    if (IS_TRADE) {
      return [
        activeConfig.logExportHeader, "─".repeat(40),
        `Category:   ${catLabel}`, `Date/Time:  ${date}`, "",
        "CLIENT ISSUE",        log.client_issue    ?? log.description, "",
        "DIAGNOSTIC FINDINGS", log.diagnostic_findings ?? "",          "",
        "WORK PERFORMED",      log.action_taken    ?? "",              "",
        "MATERIALS USED",      log.materials_used  ?? "",              "",
        "NEXT STEPS",          log.recommended_next_steps ?? log.follow_up, "",
        "─".repeat(40), activeConfig.logExportFooter,
      ].join("\n");
    }
    return [
      activeConfig.logExportHeader, "─".repeat(40),
      `Category:   ${catLabel}`, `Date/Time:  ${date}`, "",
      "SUMMARY",      log.summary,      "",
      "DESCRIPTION",  log.description,  "",
      "ACTION TAKEN", log.action_taken, "",
      "FOLLOW-UP",    log.follow_up,    "",
      "─".repeat(40), activeConfig.logExportFooter,
    ].join("\n");
  }

  function copyEdited() {
    if (!edited) return;
    navigator.clipboard?.writeText(
      buildCopyText({ ...edited, createdAt: new Date().toISOString() })
    );
    showToast("✓ Copied to clipboard");
  }

  function copyLog(log) {
    navigator.clipboard?.writeText(buildCopyText(log));
    showToast("✓ Copied");
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function handleDistrictChange(id) {
    setDistrict(id);
    lsSet("logit_district", id);
  }

  // Home CTA — navigate to idle RecordingScreen; mic tap there actually starts.
  function handleNavigateToRecord() {
    if (usage >= activeConfig.freeLimit) {
      setShowUpgrade(true);
      return;
    }
    setRecordingFor("job");
    setTab("record");
  }

  // Called by the mic button on the idle RecordingScreen.
  async function handleStartRecording() {
    setRecordingFor("job");
    await recorder.startRecording();
  }

  async function handleStartVehicleRecording() {
    setRecordingFor("vehicle");
    await recorder.startRecording();
  }

  function handleTabChange(id) {
    if (id === "record" && usage >= activeConfig.freeLimit) {
      setShowUpgrade(true);
      return;
    }
    if (phase === "result") discard();
    setTab(id);
  }

  // ── Dev mode toggle ─────────────────────────────────────────────────────────
  function handleModeToggle() {
    setActiveMode((prev) => (prev === "trade" ? "educator" : "trade"));
    // Reset logs filter state when swapping modes so category pills don't
    // show invalid values from the previous mode's category list.
    setTab("home");
    discard();
  }

  // ── Derived display flags ──────────────────────────────────────────────────
  const isRecording    = recorder.isRecording;
  const showResult     = phase === "result" && edited !== null;
  const showProcessing = phase === "processing";
  const isDark         = IS_TRADE || tab !== "home" || showResult || showProcessing || isRecording || tab === "vehicle";

  return (
    <ModeContext.Provider value={activeConfig}>
      <div
        className={`min-h-screen flex items-start justify-center p-4 sm:p-8 sm:items-center ${
          IS_TRADE ? "bg-zinc-950" : "bg-slate-100"
        }`}
      >
        {/* ── Phone shell ── */}
        <div
          className={`w-full max-w-sm flex flex-col relative overflow-hidden rounded-[2.75rem] transition-colors duration-300 ${
            isDark
              ? "bg-[#111118] border border-white/8"
              : "bg-white border border-slate-200"
          }`}
          style={{ minHeight: "780px" }}
        >
          <StatusBar isDark={isDark} usage={mounted ? usage : 0} />

          {recorder.error && !isRecording && (
            <div className="mx-5 mt-2 mb-0 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[12px] text-red-700 leading-relaxed flex-shrink-0">
              {recorder.error}
            </div>
          )}

          {/* ── Full-height overlays ── */}
          {showResult && (
            <ResultScreen
              result={edited}
              onFieldChange={(key, val) => setEdited((prev) => ({ ...prev, [key]: val }))}
              onCategoryChange={(cat) => setEdited((prev) => ({ ...prev, category: cat }))}
              onSave={saveLog}
              onDiscard={discard}
              onCopy={copyEdited}
              onShare={handleShare}
              photos={pendingPhotos}
              onAddPhoto={IS_TRADE ? handleAddPhoto : undefined}
              onRemovePhoto={handleRemovePhoto}
              aiError={aiError}
            />
          )}

          {showProcessing && <ProcessingOverlay />}

          {isRecording && (
            <RecordingScreen
              isRecording
              recordingSeconds={recorder.recordingSeconds}
              onStop={recorder.stopRecording}
            />
          )}

          {/* ── Tab content ── */}
          {!showResult && !showProcessing && !isRecording && (
            <>
              {tab === "home" && (
                <HomeScreen
                  logs={mounted ? logs : []}
                  usage={mounted ? usage : 0}
                  freeLimit={activeConfig.freeLimit}
                  district={district}
                  onDistrictChange={handleDistrictChange}
                  onStartLogging={handleNavigateToRecord}
                  onModeToggle={IS_DEV ? handleModeToggle : undefined}
                  onUpgradeTap={() => setShowUpgrade(true)}
                />
              )}
              {tab === "record" && (
                <RecordingScreen
                  isRecording={false}
                  recordingSeconds={0}
                  onStart={handleStartRecording}
                  onStop={recorder.stopRecording}
                />
              )}
              {tab === "logs" && (
                <LogsScreen
                  logs={mounted ? logs : []}
                  onDelete={deleteLog}
                  onCopy={copyLog}
                  onShare={IS_TRADE ? handleShare : undefined}
                  photoCounts={photoCounts}
                  onLoadPhotos={loadPhotosForLog}
                />
              )}
              {tab === "vehicle" && (
                <VehicleLogScreen
                  vehicleLogs={mounted ? vehicleLogs : []}
                  isRecording={recorder.isRecording && recordingFor === "vehicle"}
                  recordingSeconds={recorder.recordingSeconds}
                  onStartRecording={handleStartVehicleRecording}
                  onStopRecording={recorder.stopRecording}
                  aiDraft={vehicleAiDraft}
                  onClearDraft={() => setVehicleAiDraft(null)}
                  onSaveVehicleLog={saveVehicleLog}
                  onDeleteVehicleLog={deleteVehicleLog}
                  showToast={showToast}
                />
              )}
            </>
          )}

          {/* ── Tab bar ── */}
          {!isRecording && !showProcessing && (
            <TabBar
              activeTab={tab}
              isDark={isDark || showResult}
              tabs={TABS}
              onTabChange={handleTabChange}
            />
          )}

          {/* ── Toast ── */}
          {toast && (
            <div
              className="absolute bottom-20 left-1/2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-[12px] text-white whitespace-nowrap z-20 pointer-events-none"
              style={{ animation: "toastIn 0.25s ease", transform: "translateX(-50%)" }}
            >
              {toast}
            </div>
          )}

          {/* ── Upgrade sheet (shown at the free limit) ── */}
          {showUpgrade && (
            <UpgradeSheet
              onClose={() => setShowUpgrade(false)}
              usage={usage}
              freeLimit={activeConfig.freeLimit}
            />
          )}
        </div>
      </div>
    </ModeContext.Provider>
  );
}

// ── Page export — wraps AppShell in Suspense so useSearchParams is allowed ───
// Next.js requires a Suspense boundary around any component that calls
// useSearchParams() when the page could be statically rendered.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AppShell />
    </Suspense>
  );
}

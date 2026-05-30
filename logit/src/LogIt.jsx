import { useState, useRef, useEffect, useCallback } from "react";

/* ─── STORAGE ─── */
const LOG_KEY = "logit_logs";
const USAGE_KEY = "logit_monthly_usage";
const MONTH_KEY = "logit_usage_month";
const FREE_LIMIT = 10;

function getLogs() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { return []; }
}
function saveLogs(l) { try { localStorage.setItem(LOG_KEY, JSON.stringify(l)); } catch {} }
function getUsage() {
  const month = new Date().toISOString().slice(0, 7);
  if (localStorage.getItem(MONTH_KEY) !== month) {
    localStorage.setItem(MONTH_KEY, month);
    localStorage.setItem(USAGE_KEY, "0");
    return 0;
  }
  return parseInt(localStorage.getItem(USAGE_KEY) || "0");
}
function bumpUsage() {
  const n = getUsage() + 1;
  localStorage.setItem(USAGE_KEY, String(n));
  return n;
}

/* ─── CATEGORY CONFIG ─── */
const CATS = {
  behavioral:     { label: "Behavioral",      color: "#E63946", bg: "rgba(230,57,70,0.12)" },
  academic:       { label: "Academic",        color: "#4361EE", bg: "rgba(67,97,238,0.12)" },
  parent_contact: { label: "Parent Contact",  color: "#2D9E75", bg: "rgba(45,158,117,0.12)" },
  intervention:   { label: "Intervention",    color: "#9D4EDD", bg: "rgba(157,78,221,0.12)" },
  positive:       { label: "Positive Note",   color: "#C9A84C", bg: "rgba(201,168,76,0.12)" },
};
const KEYWORDS = {
  behavioral: [
    "disruptive", "disruption", "disrespectful", "refusal", "refused",
    "yelling", "arguing", "fight", "fighting", "hit", "pushed", "kicked",
    "bullying", "threat", "unsafe", "off task", "out of seat",
    "inappropriate", "profanity", "defiant", "eloped", "left class",
    "skipped", "tardy", "redirection", "consequence"
  ],
  academic: [
    "missing work", "incomplete", "failed", "failing", "quiz", "test",
    "assignment", "homework", "classwork", "participation", "not prepared",
    "did not submit", "late work", "grade", "grades", "progress",
    "intervention", "tutoring", "support", "accommodations", "iep", "504",
    "reading", "math", "writing"
  ],
  parent_contact: [
    "called parent", "emailed parent", "parent conference", "guardian",
    "voicemail", "left message", "spoke with mom", "spoke with dad",
    "contact home", "family notified", "parent pickup", "meeting scheduled",
    "follow up with parent", "texted parent", "parent response"
  ]
};

function suggestCategory(text) {
  const lower = text.toLowerCase();
  const scores = Object.entries(KEYWORDS).map(([category, words]) => ({
    category,
    score: words.reduce((count, word) => lower.includes(word) ? count + 1 : count, 0)
  }));

  scores.sort((a, b) => b.score - a.score);

  return scores[0].score > 0 ? scores[0].category : null;
}


/* ─── DISTRICT TEMPLATES ─── */
const DISTRICTS = [
  { id: "none",      label: "Standard only",      state: "",   icon: "🚫" },
  { id: "philly_sdp",label: "Philadelphia SDP",    state: "PA", icon: "📋" },
  { id: "delco",     label: "Delaware County",     state: "PA", icon: "📋" },
  { id: "pa_generic",label: "Pennsylvania",        state: "PA", icon: "📋" },
  { id: "nj_generic",label: "New Jersey",          state: "NJ", icon: "📋" },
];

function getDistrict() {
  try { return localStorage.getItem("logit_district") || "none"; } catch { return "none"; }
}
function saveDistrict(id) {
  try { localStorage.setItem("logit_district", id); } catch {}
}

/* ─── NAME SCRUBBER ─── */
function scrubNames(text) {
  if (!text) return text;
  const codeMap = {};
  let codeIndex = 0;
  const codes = ["Student A", "Student B", "Student C", "Student D", "Student E"];
  let scrubbed = text.replace(/\b([A-Z][a-z]{1,12})\s+([A-Z][a-z]{1,15})\b/g, (match) => {
    if (!codeMap[match]) { codeMap[match] = codes[codeIndex++ % codes.length]; }
    return codeMap[match];
  });
  const commonWords = new Set(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday","January","February","March","April","May","June","July","August","September","October","November","December","Math","English","Science","Reading","Writing","Art","Music","PE","The","This","That","There","Their","Today","Tomorrow","Yesterday","During","After","Before","Student","Teacher","Class","School","Grade"]);
  scrubbed = scrubbed.replace(/\b([A-Z][a-z]{2,12})\b/g, (match) => {
    if (commonWords.has(match) || match.startsWith("Student")) return match;
    if (!codeMap[match]) { codeMap[match] = codes[codeIndex++ % codes.length]; }
    return codeMap[match];
  });
  return scrubbed;
}

/* ─── AI FORMAT ─── */
async function formatWithClaude(transcript, category, studentCode) {
  const catLabel = CATS[category]?.label || "Behavioral";
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = today.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const scrubbedTranscript = scrubNames(transcript);
  const districtId = localStorage.getItem("logit_district") || "none";
  const DISTRICT_PROMPTS_MAP = {
    philly_sdp: "generate behavior_referral with fields: alignment, title, incident_time_frame_code, context_description, location_description, details, damages. Also generate osr5_statement with fields: date, location, narrative (first person), persons_involved",
    delco: "generate district_report with fields: incident_type (Physical Altercation|Verbal Altercation|Insubordination|Property Damage|Bullying|Other), location, witnesses, parent_notified, administrator_notified, details, recommended_consequence",
    pa_generic: "generate pa_report with fields: incident_type (Physical Altercation|Verbal Altercation|Insubordination|Property Damage|Bullying|Weapons|Substance|Other), location, time_frame, witnesses, parent_notified, administrator_notified, police_notified, details, action_taken",
    nj_generic: "generate nj_report with fields: incident_classification (HIB - Harassment Intimidation Bullying|Physical Altercation|Insubordination|Vandalism|Substance|Other), location, time_of_day, witnesses, hib_determination (Yes|No|Under Investigation), parent_guardian_notified, law_enforcement_notified, details, interventions_used"
  };
  const districtPrompt = DISTRICT_PROMPTS_MAP[districtId] || "";
  try {
    const res = await fetch("/api/format-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: scrubbedTranscript, categoryLabel: catLabel, studentCode: studentCode || "Student A", dateStr, timeStr, districtId, districtPrompt })
    });
    if (!res.ok) throw new Error(`format-report returned ${res.status}`);
    const data = await res.json();
    return {
      category,
      districtId,
      summary:          scrubNames(data.summary     || "Incident documented via voice log."),
      description:      scrubNames(data.description || scrubbedTranscript),
      action:           scrubNames(data.action_taken || "Teacher responded and documented the incident."),
      followup:         scrubNames(data.follow_up    || "Review as needed."),
      behavior_referral: data.behavior_referral || null,
      osr5_statement:    data.osr5_statement    || null,
      district_report:   data.district_report   || null,
      nj_report:         data.nj_report         || null,
      pa_report:         data.pa_report         || null,
    };
  } catch (error) {
    console.error("AI formatting failed:", error);
    const fallback = scrubNames(scrubbedTranscript);
    return { category, districtId: getDistrict(), summary: fallback.slice(0, 80) + (fallback.length > 80 ? "..." : ""), description: fallback, action: "Incident documented via voice log.", followup: "Review as needed.", behavior_referral: null, osr5_statement: null, district_report: null, nj_report: null, pa_report: null };
  }
}

/* ─── CSS ─── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',sans-serif;background:#0A0A0F;-webkit-font-smoothing:antialiased;}

.li-app{min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 30% 20%,rgba(67,97,238,0.06),transparent 60%),radial-gradient(ellipse at 70% 80%,rgba(230,57,70,0.05),transparent 60%),#0A0A0F;padding:20px;}
.li-shell{width:100%;max-width:390px;height:780px;border-radius:44px;overflow:hidden;position:relative;display:flex;flex-direction:column;transition:background 0.3s ease,border-color 0.3s ease;}

/* ── STATUS BAR ── */
.li-statusbar{display:flex;justify-content:space-between;align-items:center;padding:14px 20px 0;flex-shrink:0;background:#F8FAFF;}
.li-wordmark{display:flex;align-items:center;gap:0;line-height:1;}
.li-counter{font-family:'DM Mono',monospace;font-size:11px;}

/* ── TAB BAR ── */
.li-tabbar{display:flex;flex-shrink:0;}
.li-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 8px 14px;cursor:pointer;gap:3px;border:none;background:transparent;transition:all 0.15s;}
.li-tab-icon{font-size:20px;line-height:1;}
.li-tab-label{font-size:10px;font-weight:500;letter-spacing:0.02em;font-family:'Inter',sans-serif;}
.li-tab.active .li-tab-label{}
.li-tab.inactive .li-tab-label{}
.li-tab.active .li-tab-icon{opacity:1;}
.li-tab.inactive .li-tab-icon{opacity:0.35;}

/* ── SCROLL CONTENT ── */
.li-scroll{flex:1;overflow-y:auto;scrollbar-width:none;background:#F8FAFF;}
.li-scroll::-webkit-scrollbar{display:none;}

/* ── HOME SCREEN ── */
.li-home{padding:0 24px 24px;background:#F8FAFF;}
.li-home-hero{padding:24px 0 20px;border-bottom:1px solid #E0E8F5;}
.li-home-eyebrow{font-family:'DM Mono',monospace;font-size:10px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:#185FA5;margin-bottom:8px;}
.li-home-title{font-family:'Inter',sans-serif;font-size:17px;font-weight:700;color:#0A0F1E;line-height:1.3;margin-bottom:6px;letter-spacing:-0.2px;}
.li-home-sub{font-size:13px;color:#5A6A8A;line-height:1.6;font-family:'Inter',sans-serif;font-weight:400;letter-spacing:0;}

/* Usage meter */
.li-usage-bar{margin:20px 0;border-bottom:1px solid #E0E8F5;padding-bottom:20px;}
.li-usage-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.li-usage-label{font-size:12px;color:#7A8AAA;}
.li-usage-count{font-family:'DM Mono',monospace;font-size:12px;color:#334;}
.li-usage-track{height:4px;background:#D8E4F5;border-radius:2px;overflow:hidden;}
.li-usage-fill{height:100%;border-radius:2px;background:#E63946;transition:width 0.4s ease;}
.li-usage-reset{font-size:10px;color:#8899BB;margin-top:5px;}

/* Features */
.li-features{padding:20px 0;border-bottom:1px solid #E0E8F5;display:flex;flex-direction:column;gap:14px;}
.li-feature{display:flex;align-items:flex-start;gap:12px;}
.li-feature-icon{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.li-feature-title{font-size:13px;font-weight:600;color:#0A0F1E;margin-bottom:2px;}
.li-feature-sub{font-size:12px;color:#7A8AAA;line-height:1.5;}

/* Tips */
.li-tips{padding:20px 0;border-bottom:1px solid #E0E8F5;}
.li-tips-title{font-family:'DM Mono',monospace;font-size:9px;color:#8899BB;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;}
.li-tip{display:flex;gap:10px;margin-bottom:8px;align-items:flex-start;}
.li-tip-num{font-family:'DM Mono',monospace;font-size:10px;color:#378ADD;flex-shrink:0;margin-top:1px;}
.li-tip-text{font-size:12px;color:#5A6A8A;line-height:1.5;}
.li-tip-text strong{color:#0A0F1E;font-weight:600;}

/* Last log card */
.li-last-log{margin:20px 0;border-bottom:1px solid #E0E8F5;padding-bottom:20px;}
.li-last-log-title{font-family:'DM Mono',monospace;font-size:9px;color:#8899BB;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;}
.li-last-log-card{background:#F0F5FC;border:1px solid #D8E4F5;border-radius:12px;padding:12px 14px;}
.li-last-log-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.li-last-log-cat{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;}
.li-last-log-date{font-family:'DM Mono',monospace;font-size:10px;color:#8899BB;}
.li-last-log-sum{font-size:13px;color:#334466;line-height:1.4;}

/* FERPA card */
.li-ferpa-card{margin:20px 0;background:rgba(67,97,238,0.08);border:1px solid rgba(67,97,238,0.18);border-radius:14px;padding:14px;}
.li-ferpa-header{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.li-ferpa-title{font-family:'DM Mono',monospace;font-size:10px;font-weight:500;color:rgba(120,150,255,0.9);text-transform:uppercase;letter-spacing:0.08em;}
.li-ferpa-body{font-size:11px;color:#5A6A8A;line-height:1.6;}
.li-ferpa-list{list-style:none;margin-top:6px;display:flex;flex-direction:column;gap:5px;}
.li-ferpa-list li{font-size:11px;color:#5A6A8A;padding-left:14px;position:relative;line-height:1.5;}
.li-ferpa-list li::before{content:"·";position:absolute;left:0;color:rgba(120,150,255,0.5);}

/* CTA */
.li-home-cta{padding:4px 0 8px;}
.li-cta-btn{width:100%;padding:14px;border-radius:14px;border:none;background:#0A0F1E;color:white;font-family:'Inter',sans-serif;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;}
.li-cta-btn:hover{opacity:0.92;}

/* ── DISTRICT PICKER ── */

.li-how-title{font-size:10px;font-weight:700;color:#0A0F1E;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;}
.li-steps{display:flex;flex-direction:column;gap:10px;padding-bottom:16px;border-bottom:1px solid #E0E8F5;margin-bottom:16px;}
.li-step{display:flex;gap:10px;align-items:flex-start;}
.li-step-num{width:22px;height:22px;border-radius:50%;background:#E63946;color:white;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
.li-step-title{font-size:13px;font-weight:600;color:#0A0F1E;margin-bottom:2px;}
.li-step-sub{font-size:11px;color:#7A8AAA;line-height:1.5;}

.li-district-section{margin:14px 0;padding-bottom:14px;border-bottom:1px solid #E0E8F5;}
.li-district-label{font-family:'DM Mono',monospace;font-size:9px;font-weight:600;color:#8899BB;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;}
.li-district-list{display:flex;flex-direction:column;gap:5px;}
.li-district-btn{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:10px;border:1.5px solid #E0E8F5;background:white;cursor:pointer;transition:all 0.15s;font-family:'Inter',sans-serif;}
.li-district-btn.active{border-color:#4361EE;background:#EEF1FD;}
.li-district-btn-left{display:flex;align-items:center;gap:8px;}
.li-district-btn-name{font-size:12px;font-weight:500;color:#0A0F1E;}
.li-district-btn.active .li-district-btn-name{color:#185FA5;font-weight:600;}
.li-district-state{font-size:9px;font-weight:600;border-radius:20px;padding:2px 6px;}
.li-district-state.pa{background:#EEF1FD;color:#4361EE;}
.li-district-state.nj{background:#EEF7F2;color:#2D9E75;}
.li-district-check{font-size:12px;color:#4361EE;}

.li-home-footer{text-align:center;font-size:10px;color:#8899BB;line-height:1.6;padding:12px 0 4px;}

/* ── RECORD SCREEN ── */
.li-idle{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;position:relative;}
.li-ring{position:absolute;border-radius:50%;border:1px solid rgba(255,255,255,0.04);transition:transform 0.5s ease,opacity 0.5s ease;}
.li-ring-1{width:290px;height:290px;}
.li-ring-2{width:220px;height:220px;border-color:rgba(255,255,255,0.06);}
.li-ring-3{width:158px;height:158px;border-color:rgba(255,255,255,0.09);}
.li-idle:active .li-ring{transform:scale(1.05);opacity:0.6;}
.li-mic{width:92px;height:92px;border-radius:50%;background:#E63946;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:34px;position:relative;z-index:1;box-shadow:0 0 48px rgba(230,57,70,0.35);}
.li-idle:active .li-mic{transform:scale(0.93);}
.li-tap-hint{font-size:13px;color:rgba(255,255,255,0.25);margin-top:26px;position:relative;z-index:1;}

.li-recording{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;user-select:none;padding:0 32px;}
.li-rec-dot{width:9px;height:9px;border-radius:50%;background:#E63946;animation:blink 1s infinite;margin-bottom:22px;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}
.li-timer{font-family:'DM Mono',monospace;font-size:54px;font-weight:400;color:white;letter-spacing:-3px;margin-bottom:18px;line-height:1;}
.li-transcript-live{font-size:14px;color:rgba(255,255,255,0.3);text-align:center;line-height:1.6;min-height:50px;font-style:italic;}
.li-transcript-live.has-text{color:rgba(255,255,255,0.6);}
.li-stop-hint{margin-top:36px;font-size:11px;color:rgba(255,255,255,0.18);letter-spacing:0.05em;}

.li-processing{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;}
.li-spinner{width:36px;height:36px;border:1.5px solid rgba(255,255,255,0.08);border-top-color:rgba(255,255,255,0.6);border-radius:50%;animation:spin 0.7s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
.li-proc-text{font-size:13px;color:rgba(255,255,255,0.3);}

/* ── RESULT ── */
.li-result{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.li-result-top{padding:22px 24px 14px;flex-shrink:0;}
.li-cat-badge{display:inline-flex;align-items:center;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;margin-bottom:12px;}
.li-result-summary{font-size:17px;font-weight:500;color:white;line-height:1.4;}
.li-result-scroll-wrap{position:relative;flex:1;min-height:0;max-height:60vh;}
.li-result-scroll-wrap::after{content:"";position:absolute;bottom:0;left:0;right:0;height:36px;pointer-events:none;background:linear-gradient(to bottom,rgba(10,10,15,0),rgba(10,10,15,0.92));}
.li-result-scroll{height:100%;overflow-y:auto;scroll-behavior:smooth;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:0 18px 28px 24px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.28) rgba(255,255,255,0.08);scrollbar-gutter:stable;}
.li-result-scroll::-webkit-scrollbar{width:8px;}
.li-result-scroll::-webkit-scrollbar-track{background:rgba(255,255,255,0.08);border-radius:10px;}
.li-result-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.28);border-radius:10px;}
.li-result-scroll::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.40);}
.li-field{border-top:1px solid rgba(255,255,255,0.06);padding:13px 0;}
.li-field-label{font-family:'DM Mono',monospace;font-size:9px;color:rgba(255,255,255,0.22);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:5px;}
.li-field-val{font-size:13px;color:rgba(255,255,255,0.65);line-height:1.6;background:transparent;border:none;width:100%;font-family:'Inter',sans-serif;resize:none;outline:none;}
.li-field-val:focus{color:white;}
.li-field-select{font-size:13px;color:rgba(255,255,255,0.65);background:transparent;border:none;width:100%;font-family:'Inter',sans-serif;outline:none;cursor:pointer;appearance:none;}
.li-district-forms{padding:0 24px 8px;flex-shrink:0;scrollbar-width:none;}
.li-district-forms::-webkit-scrollbar{display:none;}
.li-district-form-section{border-top:1px solid rgba(255,255,255,0.06);padding:11px 0;}
.li-district-form-section summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;}
.li-district-form-section summary::-webkit-details-marker{display:none;}
.li-district-form-title{font-family:'DM Mono',monospace;font-size:9px;color:rgba(255,255,255,0.28);text-transform:uppercase;letter-spacing:0.12em;}
.li-district-form-title::before{content:"+";display:inline-block;width:12px;color:rgba(255,255,255,0.22);}
.li-district-form-section[open] .li-district-form-title::before{content:"-";}
.li-district-copy{border:1px solid rgba(255,255,255,0.1);border-radius:8px;background:transparent;color:rgba(255,255,255,0.35);font-family:'Inter',sans-serif;font-size:11px;padding:5px 10px;cursor:pointer;flex-shrink:0;}
.li-district-copy:hover{border-color:rgba(255,255,255,0.2);color:rgba(255,255,255,0.65);}
.li-district-fields{padding-top:10px;display:flex;flex-direction:column;gap:8px;}
.li-district-field-label{font-family:'DM Mono',monospace;font-size:8px;color:rgba(255,255,255,0.18);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px;}
.li-district-field-value{min-height:36px;max-height:120px;overflow-y:auto;width:100%;min-height:34px;border:1px solid rgba(255,255,255,0.08);border-radius:8px;background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.58);font-family:'Inter',sans-serif;font-size:12px;line-height:1.45;padding:8px 9px;resize:vertical;outline:none;}
.li-ferpa-note{text-align:center;padding:6px 24px 8px;font-size:10px;color:rgba(255,255,255,0.12);line-height:1.5;flex-shrink:0;}
.li-report-actions{padding:0 24px 6px;flex-shrink:0;}
.li-copy-main{width:100%;padding:11px 14px;border-radius:12px;border:none;background:white;color:#0A0A0F;font-family:'Inter',sans-serif;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:0;transition:opacity 0.15s;}
.li-copy-main:hover{opacity:0.92;}
.li-pro-panel{border:none;background:transparent;border-radius:0;padding:0;}
.li-pro-panel-result{margin:0 24px 4px;flex-shrink:0;}
.li-ferpa-note + div .li-reformat{padding:12px 14px;border:none;background:white;color:#0A0A0F;font-size:13px;font-weight:700;border-radius:12px;margin-bottom:10px;}
.li-ferpa-note + div .li-reformat:hover{opacity:0.92;color:#0A0A0F;}
.li-pro-heading{display:flex;align-items:center;gap:4px;font-family:'DM Mono',monospace;font-size:8px;color:rgba(245,207,104,0.62);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:5px;}
.li-pro-crown{color:#D8B44A;font-size:10px;line-height:1;}
.li-pro-grid{display:flex;flex-wrap:wrap;gap:5px;}
.li-pro-btn{min-height:24px;border:1px solid rgba(201,168,76,0.18);border-radius:999px;background:rgba(201,168,76,0.045);color:rgba(255,255,255,0.52);font-family:'Inter',sans-serif;font-size:10px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:4px 8px;line-height:1.1;}
.li-pro-btn:hover{background:rgba(201,168,76,0.09);border-color:rgba(201,168,76,0.3);color:rgba(255,255,255,0.78);}
.li-pro-modal-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.54);z-index:30;display:flex;align-items:center;justify-content:center;padding:24px;}
.li-pro-modal{width:100%;max-width:330px;border:1px solid rgba(201,168,76,0.32);border-radius:18px;background:#171717;color:white;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,0.45);}
.li-pro-modal-title{font-size:19px;font-weight:700;margin-bottom:10px;color:white;}
.li-pro-modal-copy{font-size:13px;color:rgba(255,255,255,0.62);line-height:1.6;margin-bottom:8px;}
.li-pro-modal-list{list-style:none;display:flex;flex-direction:column;gap:4px;margin:8px 0 14px;}
.li-pro-modal-list li{font-size:13px;color:rgba(255,255,255,0.74);}
.li-pro-price{font-family:'DM Mono',monospace;font-size:15px;color:#F1C64B;margin-bottom:14px;}
.li-pro-modal-actions{display:flex;gap:10px;}
.li-pro-upgrade{flex:1;padding:12px;border:none;border-radius:12px;background:#F1C64B;color:#201700;font-family:'Inter',sans-serif;font-size:13px;font-weight:700;cursor:pointer;}
.li-pro-later{flex:1;padding:12px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;background:transparent;color:rgba(255,255,255,0.56);font-family:'Inter',sans-serif;font-size:13px;cursor:pointer;}
.li-result-actions{padding:12px 24px 16px;flex-shrink:0;display:flex;gap:10px;}
.li-save{flex:2;padding:14px;border-radius:14px;border:none;background:white;color:#0A0A0F;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;cursor:pointer;}
.li-save:hover{opacity:0.92;}
.li-discard{flex:1;padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.35);font-family:'Inter',sans-serif;font-size:13px;cursor:pointer;}
.li-discard:hover{border-color:rgba(255,255,255,0.2);color:rgba(255,255,255,0.6);}
.li-reformat{width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.3);font-family:'Inter',sans-serif;font-size:12px;cursor:pointer;margin-bottom:4px;transition:all 0.15s;}
.li-reformat:hover{border-color:rgba(255,255,255,0.2);color:rgba(255,255,255,0.6);}
.li-ai-error{margin:0 24px 8px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.2);border-radius:10px;padding:10px 12px;font-size:11px;color:rgba(201,168,76,0.9);line-height:1.5;flex-shrink:0;}
.li-error{margin:8px 20px 0;background:#FEE8E8;border:1px solid rgba(230,57,70,0.3);border-radius:10px;padding:10px 12px;font-size:12px;color:#C1220A;line-height:1.5;flex-shrink:0;}

/* ── LOGS SCREEN ── */
.li-logs{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.li-logs-header{padding:20px 24px 12px;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;}
.li-logs-title{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:white;}
.li-logs-meta{font-family:'DM Mono',monospace;font-size:11px;color:rgba(255,255,255,0.25);}
.li-logs-scroll{flex:1;overflow-y:auto;padding:0 16px 16px;scrollbar-width:none;}
.li-logs-scroll::-webkit-scrollbar{display:none;}
.li-log-item{border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:12px 14px;margin-bottom:8px;}
.li-log-item:hover{border-color:rgba(255,255,255,0.14);}
.li-log-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;}
.li-log-cat{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;}
.li-log-date{font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.2);}
.li-log-sum{font-size:13px;color:rgba(255,255,255,0.6);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.li-log-foot{display:flex;justify-content:space-between;align-items:center;margin-top:8px;}
.li-copy-portal{font-size:11px;color:rgba(255,255,255,0.3);background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:4px 10px;cursor:pointer;transition:all 0.15s;font-family:'Inter',sans-serif;}
.li-copy-portal:hover{color:rgba(255,255,255,0.7);border-color:rgba(255,255,255,0.25);}
.li-del{font-size:11px;color:rgba(255,255,255,0.2);background:transparent;border:none;cursor:pointer;padding:4px 8px;border-radius:4px;font-family:'Inter',sans-serif;}
.li-del:hover{color:#E63946;background:rgba(230,57,70,0.1);}
.li-logs-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;text-align:center;}
.li-logs-empty-icon{font-size:36px;margin-bottom:12px;opacity:0.3;}
.li-logs-empty-text{font-size:13px;color:rgba(255,255,255,0.2);line-height:1.6;}


/* ── SETTINGS SCREEN ── */
.li-settings{flex:1;overflow-y:auto;scrollbar-width:none;}
.li-settings::-webkit-scrollbar{display:none;}
.li-settings-content{padding:0 20px 24px;}
.li-settings-section{margin-top:20px;margin-bottom:4px;}
.li-settings-section-title{font-family:'DM Mono',monospace;font-size:9px;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:0.12em;padding:0 4px;margin-bottom:8px;}
.li-settings-group{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:hidden;}
.li-settings-row{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;transition:background 0.15s;}
.li-settings-row:last-child{border-bottom:none;}
.li-settings-row:hover{background:rgba(255,255,255,0.04);}
.li-settings-row-left{display:flex;align-items:center;gap:12px;}
.li-settings-row-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;}
.li-settings-row-label{font-size:14px;color:white;font-weight:400;}
.li-settings-row-value{font-size:13px;color:rgba(255,255,255,0.35);font-family:'DM Mono',monospace;}
.li-settings-row-arrow{font-size:12px;color:rgba(255,255,255,0.2);}
.li-pro-badge{display:inline-flex;align-items:center;gap:4px;background:#C9A84C;color:#3A2800;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700;font-family:'Inter',sans-serif;}

/* ── LOGS SEARCH + FILTER ── */
.li-logs-search{margin:0 16px 10px;position:relative;}
.li-logs-search-input{width:100%;padding:9px 14px 9px 36px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.06);color:white;font-family:'Inter',sans-serif;font-size:13px;outline:none;}
.li-logs-search-input::placeholder{color:rgba(255,255,255,0.25);}
.li-logs-search-input:focus{border-color:rgba(255,255,255,0.2);background:rgba(255,255,255,0.08);}
.li-logs-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:13px;color:rgba(255,255,255,0.25);pointer-events:none;}
.li-logs-filters{display:flex;gap:6px;padding:0 16px 10px;overflow-x:auto;scrollbar-width:none;flex-shrink:0;}
.li-logs-filters::-webkit-scrollbar{display:none;}
.li-filter-pill{flex-shrink:0;padding:5px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.1);background:transparent;font-size:11px;font-weight:500;color:rgba(255,255,255,0.4);cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.15s;white-space:nowrap;}
.li-filter-pill.active{background:white;color:#0A0F1E;border-color:white;font-weight:600;}

/* ── LIMIT ── */
.li-limit{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;text-align:center;gap:10px;}
.li-limit-icon{font-size:38px;}
.li-limit h2{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:white;}
.li-limit p{font-size:13px;color:rgba(255,255,255,0.35);line-height:1.6;}
.li-upgrade{background:white;color:#0A0A0F;border:none;border-radius:14px;padding:14px 28px;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;}
.li-limit-sub{font-size:11px;color:rgba(255,255,255,0.18);}
.li-waitlist{display:flex;gap:8px;margin-top:8px;width:100%;}
.li-waitlist-input{flex:1;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:white;font-family:'Inter',sans-serif;font-size:13px;outline:none;}
.li-waitlist-input::placeholder{color:rgba(255,255,255,0.3);}
.li-waitlist-input:focus{border-color:rgba(255,255,255,0.35);}
.li-waitlist-btn{padding:12px 16px;border-radius:12px;border:none;background:white;color:#0A0F1E;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;}
.li-waitlist-success{font-size:12px;color:rgba(120,200,150,0.9);margin-top:6px;}

/* ── TOAST ── */
.li-toast{position:absolute;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.1);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:8px 18px;font-size:12px;color:white;white-space:nowrap;z-index:20;animation:toastIn 0.25s ease;pointer-events:none;}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
`;

function injectCSS() {
  if (document.getElementById("li-css")) return;
  const s = document.createElement("style");
  s.id = "li-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/* ─── LIMIT SCREEN ─── */
function LimitScreen({ onDismiss, usage }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function submitWaitlist() {
    if (!email.includes("@")) return;
    // Store locally + could POST to a backend later
    try {
      const list = JSON.parse(localStorage.getItem("logit_waitlist") || "[]");
      list.push({ email, ts: new Date().toISOString() });
      localStorage.setItem("logit_waitlist", JSON.stringify(list));
    } catch {}
    setSubmitted(true);
  }

  return (
    <div className="li-limit">
      <div className="li-limit-icon">📋</div>
      <h2>Free limit reached</h2>
      <p>You've used all {FREE_LIMIT} logs this month. Pro gives you unlimited logs, auto-email to admin and parents, and PDF export.</p>
      {!submitted ? (
        <>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:4}}>Join the waitlist — we'll email you when Pro launches.</div>
          <div className="li-waitlist">
            <input
              className="li-waitlist-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&submitWaitlist()}
            />
            <button className="li-waitlist-btn" onClick={submitWaitlist}>Notify me</button>
          </div>
        </>
      ) : (
        <div className="li-waitlist-success">✓ You're on the list! We'll email you when Pro launches.</div>
      )}
      <div className="li-limit-sub">Free tier resets in {30-new Date().getDate()} days · {FREE_LIMIT} logs included</div>
      <button className="li-discard" style={{marginTop:6,border:"none"}} onClick={onDismiss}>Keep using free</button>
    </div>
  );
}

/* ─── HOME SCREEN ─── */
function HomeScreen({ logs, usage, onStartLogging, district, onDistrictChange }) {
  const lastLog = logs[0] || null;
  const usagePct = Math.min((usage / FREE_LIMIT) * 100, 100);
  const daysLeft = 30 - new Date().getDate();
  const usageColor = usage >= FREE_LIMIT ? "#E63946" : usage >= 7 ? "#C9A84C" : "#E63946";

  return (
    <div className="li-scroll">
      <div className="li-home">
        <div className="li-home-hero">
          <div className="li-home-eyebrow">For K–12 teachers</div>
          <div className="li-home-title">Speak for 30 seconds. LogIt instantly turns your voice note into a professional, FERPA-aware incident report ready for your school portal.</div>
          <div className="li-home-sub">Built to reduce after-hours paperwork for educators.</div>
        </div>

        {/* Usage meter */}
        <div className="li-usage-bar">
          <div className="li-usage-row">
            <div className="li-usage-label">This month's logs</div>
            <div className="li-usage-count">{usage} / {FREE_LIMIT}</div>
          </div>
          <div className="li-usage-track">
            <div className="li-usage-fill" style={{ width: `${usagePct}%`, background: usageColor }} />
          </div>
          <div className="li-usage-reset">
            {usage >= FREE_LIMIT
              ? "Limit reached — upgrade for unlimited logs"
              : `Resets in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} · ${FREE_LIMIT - usage} remaining`}
          </div>
        </div>

        {/* Last log preview */}
        {lastLog && (
          <div className="li-last-log">
            <div className="li-last-log-title">Most recent log</div>
            <div className="li-last-log-card">
              <div className="li-last-log-top">
                <div className="li-last-log-cat" style={{ color: CATS[lastLog.category]?.color }}>
                  {CATS[lastLog.category]?.label}
                </div>
                <div className="li-last-log-date">{new Date(lastLog.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="li-last-log-sum">{lastLog.summary}</div>
            </div>
          </div>
        )}

        {/* District picker */}
        <div className="li-district-section">
          <div className="li-district-label">My district form</div>
          <div className="li-district-list">
            {DISTRICTS.map(d => (
              <button
                key={d.id}
                className={`li-district-btn ${district === d.id ? "active" : ""}`}
                onClick={() => onDistrictChange(d.id)}
              >
                <div className="li-district-btn-left">
                  <span style={{fontSize:14}}>{d.icon}</span>
                  <span className="li-district-btn-name">{d.label}</span>
                  {d.state && (
                    <span className={`li-district-state ${d.state.toLowerCase()}`}>{d.state}</span>
                  )}
                </div>
                {district === d.id && <span className="li-district-check">✓</span>}
              </button>
            ))}
          </div>
          <div style={{fontSize:10,color:"#8899BB",marginTop:6}}>
            {district === "none" ? "Select your district to generate matching forms after recording." : `Forms will be generated for ${DISTRICTS.find(d=>d.id===district)?.label || district} after each recording.`}
          </div>
        </div>

        {/* How it works */}
        <div className="li-how-title">How it works</div>
        <div className="li-steps">
          {[
            ["1", "Tap and speak", "Describe the incident in plain language. No scripts, no forms."],
            ["2", "AI writes the report", "Names replaced, professional format, FERPA-aware. In seconds."],
            ["3", "Copy for portal", "Paste into PowerSchool, Infinite Campus, or any school system."],
          ].map(([num, title, sub]) => (
            <div key={num} className="li-step">
              <div className="li-step-num">{num}</div>
              <div>
                <div className="li-step-title">{title}</div>
                <div className="li-step-sub">{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="li-home-cta">
          <button className="li-cta-btn" onClick={onStartLogging}>
            🎙️ Start Logging
          </button>
        </div>

        <div className="li-home-footer">
          LogIt by CieroLink LLC · Free tier: 10 logs/month<br />
          Built for K–12 teachers · Not affiliated with any school district<br />
          Questions? <a href="mailto:cierolink@gmail.com" style={{color:"#185FA5",textDecoration:"none"}}>cierolink@gmail.com</a>
        </div>
      </div>
    </div>
  );
}

/* ─── SETTINGS SCREEN ─── */
function SettingsScreen({ usage, onUpgrade }) {
  const daysLeft = 30 - new Date().getDate();

  function exportLogs() {
    const logs = getLogs();
    if (!logs.length) { alert("No logs to export."); return; }
    const text = logs.map(log => {
      const c = CATS[log.category];
      return ["LOGIT DOCUMENTATION REPORT","─".repeat(40),`Category: ${c?.label}`,`Date: ${new Date(log.createdAt).toLocaleString()}`,"",log.summary,"",log.description,"","Action: "+log.action,"Follow-up: "+log.followup,""].join("\n");
    }).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "logit-export.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  function clearLogs() {
    if (window.confirm("Delete all logs? This cannot be undone.")) {
      saveLogs([]);
      alert("All logs cleared.");
    }
  }

  return (
    <div className="li-settings">
      <div className="li-settings-content">

        <div className="li-settings-section">
          <div className="li-settings-section-title">Account</div>
          <div className="li-settings-group">
            <div className="li-settings-row" onClick={onUpgrade}>
              <div className="li-settings-row-left">
                <div className="li-settings-row-icon" style={{background:"rgba(201,168,76,0.15)"}}>👑</div>
                <div className="li-settings-row-label">Upgrade to Pro</div>
              </div>
              <div className="li-pro-badge">PRO $7.99/mo</div>
            </div>
            <div className="li-settings-row">
              <div className="li-settings-row-left">
                <div className="li-settings-row-icon" style={{background:"rgba(67,97,238,0.15)"}}>📊</div>
                <div className="li-settings-row-label">Usage this month</div>
              </div>
              <div className="li-settings-row-value">{usage}/{FREE_LIMIT} logs</div>
            </div>
            <div className="li-settings-row">
              <div className="li-settings-row-left">
                <div className="li-settings-row-icon" style={{background:"rgba(45,158,117,0.15)"}}>🔄</div>
                <div className="li-settings-row-label">Resets in</div>
              </div>
              <div className="li-settings-row-value">{daysLeft} days</div>
            </div>
          </div>
        </div>

        <div className="li-settings-section">
          <div className="li-settings-section-title">Install</div>
          <div className="li-settings-group" style={{padding:"12px 14px"}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.62)",lineHeight:1.5,marginBottom:10}}>
              Add LogIt to your home screen for a faster app-like experience.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.28)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>iPhone</div>
                {["Tap Share", "Tap Add to Home Screen", "Tap Add"].map((item, i) => (
                  <div key={item} style={{fontSize:11,color:"rgba(255,255,255,0.4)",lineHeight:1.5,marginBottom:3}}>{i + 1}. {item}</div>
                ))}
              </div>
              <div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.28)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Android</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",lineHeight:1.5}}>1. Tap Install App or Add to Home Screen</div>
              </div>
            </div>
          </div>
        </div>

        <div className="li-settings-section">
          <div className="li-settings-section-title">Data</div>
          <div className="li-settings-group">
            <div className="li-settings-row" onClick={exportLogs}>
              <div className="li-settings-row-left">
                <div className="li-settings-row-icon" style={{background:"rgba(67,97,238,0.15)"}}>📤</div>
                <div className="li-settings-row-label">Export all logs</div>
              </div>
              <div className="li-settings-row-arrow">›</div>
            </div>
            <div className="li-settings-row" onClick={clearLogs}>
              <div className="li-settings-row-left">
                <div className="li-settings-row-icon" style={{background:"rgba(230,57,70,0.15)"}}>🗑️</div>
                <div className="li-settings-row-label" style={{color:"#E63946"}}>Clear all logs</div>
              </div>
              <div className="li-settings-row-arrow" style={{color:"rgba(230,57,70,0.4)"}}>›</div>
            </div>
          </div>
        </div>

        <div className="li-settings-section">
          <div className="li-settings-section-title">Privacy & FERPA</div>
          <div className="li-settings-group" style={{padding:"12px 14px"}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",lineHeight:1.6,marginBottom:4}}>
              LogIt is designed to support FERPA compliance but does not guarantee it. By using this app you agree to:
            </div>
            {["Use student codes or initials — never full names in voice recordings","Logs are stored only on your device and never uploaded to external servers","Voice transcripts are processed by Anthropic AI — do not include SSNs, medical records, or sensitive PII","You are responsible for ensuring your use complies with your district's data policies","CieroLink LLC is not a FERPA-covered entity and this tool is not legal compliance advice"].map((item,i) => (
              <div key={i} style={{display:"flex",gap:6,marginBottom:5}}>
                <span style={{color:"rgba(120,150,255,0.5)",flexShrink:0,marginTop:1}}>·</span>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.35)",lineHeight:1.5}}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="li-settings-section">
          <div className="li-settings-section-title">Support</div>
          <div className="li-settings-group">
            <div className="li-settings-row" onClick={()=>window.open("mailto:cierolink@gmail.com")}>
              <div className="li-settings-row-left">
                <div className="li-settings-row-icon" style={{background:"rgba(67,97,238,0.15)"}}>✉️</div>
                <div className="li-settings-row-label">Send feedback</div>
              </div>
              <div className="li-settings-row-arrow">›</div>
            </div>
            <div className="li-settings-row" onClick={()=>window.open("mailto:cierolink@gmail.com?subject=LogIt Bug Report")}>
              <div className="li-settings-row-left">
                <div className="li-settings-row-icon" style={{background:"rgba(230,57,70,0.15)"}}>🐛</div>
                <div className="li-settings-row-label">Report a bug</div>
              </div>
              <div className="li-settings-row-arrow">›</div>
            </div>
          </div>
        </div>

        <div className="li-settings-section">
          <div className="li-settings-section-title">About</div>
          <div className="li-settings-group">
            <div className="li-settings-row">
              <div className="li-settings-row-left">
                <div className="li-settings-row-icon" style={{background:"rgba(255,255,255,0.06)"}}>📱</div>
                <div className="li-settings-row-label">Version</div>
              </div>
              <div className="li-settings-row-value">1.0.0</div>
            </div>
            <div className="li-settings-row">
              <div className="li-settings-row-left">
                <div className="li-settings-row-icon" style={{background:"rgba(255,255,255,0.06)"}}>🏢</div>
                <div className="li-settings-row-label">Made by</div>
              </div>
              <div className="li-settings-row-value">CieroLink LLC</div>
            </div>
          </div>
        </div>

        <div style={{textAlign:"center",padding:"20px 0 8px",fontSize:10,color:"rgba(255,255,255,0.15)",lineHeight:1.6}}>
          LogIt by CieroLink LLC · Not affiliated with any school district<br/>
          All logs stored locally on your device
        </div>

      </div>
    </div>
  );
}

/* ─── LOGS SCREEN ─── */
function LogsScreen({ logs, onDelete, onCopy }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "behavioral", label: "Behavioral" },
    { id: "academic", label: "Academic" },
    { id: "parent_contact", label: "Parent Contact" },
    { id: "intervention", label: "Intervention" },
    { id: "positive", label: "Positive" },
  ];

  const filtered = logs.filter(log => {
    const matchesCat = filter === "all" || log.category === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      log.summary?.toLowerCase().includes(q) ||
      log.description?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="li-logs">
      <div className="li-logs-header">
        <div className="li-logs-title">Logs</div>
        <div className="li-logs-meta">{logs.length} total</div>
      </div>
      <div className="li-logs-search">
        <span className="li-logs-search-icon">🔍</span>
        <input
          className="li-logs-search-input"
          placeholder="Search logs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="li-logs-filters">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`li-filter-pill ${filter === f.id ? "active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {logs.length === 0 ? (
        <div className="li-logs-empty">
          <div className="li-logs-empty-icon">📋</div>
          <div className="li-logs-empty-text">No logs yet.<br />Tap Record to create your first log.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="li-logs-empty">
          <div className="li-logs-empty-icon">🔍</div>
          <div className="li-logs-empty-text">No logs match.<br />Try a different search or filter.</div>
        </div>
      ) : (
        <div className="li-logs-scroll">
          {filtered.map(log => {
            const c = CATS[log.category];
            return (
              <div key={log.id} className="li-log-item">
                <div className="li-log-top">
                  <div className="li-log-cat" style={{ color: c?.color }}>{c?.label}</div>
                  <div className="li-log-date">{new Date(log.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="li-log-sum">{log.summary}</div>
                <div className="li-log-foot">
                  <button className="li-copy-portal" onClick={() => onCopy(log)}>Copy for Portal</button>
                  <button className="li-del" onClick={() => onDelete(log.id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── MAIN APP ─── */
const DISTRICT_FORM_CONFIG = {
  nj_generic: [
    {
      title: "New Jersey Report",
      source: "nj_report",
      fields: [
        "incident_classification",
        "hib_determination",
        "location",
        "time_of_day",
        "witnesses",
        "parent_guardian_notified",
        "law_enforcement_notified",
        "details",
        "interventions_used",
      ],
    },
  ],
  philly_sdp: [
    {
      title: "Behavior Referral",
      source: "behavior_referral",
      fields: [
        "alignment",
        "title",
        "incident_time_frame_code",
        "context_description",
        "location_description",
        "details",
        "damages",
      ],
    },
    {
      title: "OSR-5 Statement",
      source: "osr5_statement",
      fields: ["date", "location", "narrative", "persons_involved"],
    },
  ],
  delco: [
    {
      title: "District Report",
      source: "district_report",
      fields: [
        "incident_type",
        "location",
        "witnesses",
        "parent_notified",
        "administrator_notified",
        "details",
        "recommended_consequence",
      ],
    },
  ],
  pa_generic: [
    {
      title: "Pennsylvania Report",
      source: "pa_report",
      fields: [
        "incident_type",
        "location",
        "time_frame",
        "witnesses",
        "parent_notified",
        "administrator_notified",
        "police_notified",
        "details",
        "action_taken",
      ],
    },
  ],
};

function fieldLabel(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}

function formatDistrictFields(title, values, fields) {
  return [
    title,
    ...fields.map(field => `${fieldLabel(field)}: ${values?.[field] ?? ""}`),
  ].join("\n");
}

function DistrictForms({ edited }) {
  const sections = DISTRICT_FORM_CONFIG[edited?.districtId] || [];
  if (!sections.length) return null;

  return (
    <div className="li-district-forms">
      {sections.map(section => {
        const values = edited?.[section.source] || {};
        const text = formatDistrictFields(section.title, values, section.fields);
        return (
          <details key={section.source} className="li-district-form-section">
            <summary>
              <span className="li-district-form-title">{section.title}</span>
              <button
                className="li-district-copy"
                type="button"
                onClick={event => {
                  event.preventDefault();
                  navigator.clipboard?.writeText(text);
                }}
              >
                Copy
              </button>
            </summary>
            <div className="li-district-fields">
              {section.fields.map(field => (
                <label key={field}>
                  <div className="li-district-field-label">{fieldLabel(field)}</div>
                  <textarea
                    className="li-district-field-value"
                    value={values?.[field] ?? ""}
                    rows={field === "details" || field === "narrative" ? 4 : 1}
                    readOnly
                  />
                </label>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function ProUpgradeModal({ onClose }) {
  return (
    <div className="li-pro-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="li-pro-modal-title">
      <div className="li-pro-modal">
        <div className="li-pro-modal-title" id="li-pro-modal-title">Unlock Pro Features</div>
        <div className="li-pro-modal-copy">Save even more time with:</div>
        <ul className="li-pro-modal-list">
          <li>• PDF export</li>
          <li>• One-tap email delivery</li>
          <li>• Secure cloud backup</li>
          <li>• Unlimited logs</li>
        </ul>
        <div className="li-pro-price">$7.99/month</div>
        <div className="li-pro-modal-actions">
          <button className="li-pro-upgrade" type="button" onClick={onClose}>Upgrade to Pro</button>
          <button className="li-pro-later" type="button" onClick={onClose}>Maybe later</button>
        </div>
      </div>
    </div>
  );
}

export default function LogIt() {
  useEffect(() => {
    injectCSS();
    document.title = "LogIt — Teacher Incident Log";
    // Warm the serverless function to reduce cold start latency
    fetch("/api/format-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: "__warmup__", districtId: "none" })
    }).catch(() => {}); // ignore errors — this is just a warmup ping
  }, []);

  const [tab, setTab] = useState("home");
  const [district, setDistrict] = useState(getDistrict());

  function handleDistrictChange(id) {
    setDistrict(id);
    saveDistrict(id);
  } // home | record | logs
  const [phase, setPhase] = useState("idle"); // idle | recording | processing | result | limit
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState(null);
  const [edited, setEdited] = useState(null);
  const [logs, setLogs] = useState(getLogs);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [aiError, setAiError] = useState("");
  const [secs, setSecs] = useState(0);
  const [stoppedRecording, setStoppedRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  const recRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    return () => { clearInterval(timerRef.current); recRef.current?.stop(); };
  }, []);

  // Auto-format after recording stops
  useEffect(() => {
    if (stoppedRecording && !processing && transcriptRef.current.trim() && result === null && phase !== "processing" && phase !== "result") {
      setStoppedRecording(false);
      processTranscript();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stoppedRecording, processing, result, phase]);

  function startTimer() { setSecs(0); timerRef.current = setInterval(() => setSecs(s => s + 1), 1000); }
  function stopTimer() { clearInterval(timerRef.current); }
  function fmt(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
  function toast_(msg) {
    const text = msg.includes("Copied for portal") ? "✓ Copied — ready to paste into your school portal" : msg;
    setToast(text);
    setTimeout(() => setToast(""), 2500);
  }

  const processTranscript = useCallback(async () => {
    const text = transcriptRef.current.trim();
    if (!text || processing) return;
    setProcessing(true);
    setAiError("");
    setPhase("processing");
    const suggestedCategory = suggestCategory(text) || "behavioral";
    const formatted = await formatWithClaude(text, suggestedCategory, "Student A");
    if (!formatted || !formatted.summary) {
      setAiError("AI formatting failed. You can edit the report below.");
    }
    setResult(formatted);
    setEdited({ ...formatted });
    setProcessing(false);
    setPhase("result");
  }, [processing]);

  async function handleTap() {
    if (phase !== "idle") return;
    setError(""); setAiError("");
    if (getUsage() >= FREE_LIMIT) { setPhase("limit"); return; }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setError(e.name === "NotAllowedError"
        ? "Microphone access denied. Please allow microphone in browser settings."
        : "No microphone found. Please connect a microphone.");
      return;
    }
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isIOS || isSafari) {
        setError("Voice recording doesn't work in Safari. Please open this page in Chrome on your computer or Android device. On iPhone, try Chrome for iOS.");
      } else {
        setError("Voice recording requires Chrome or Edge. Please copy this URL and open it in Chrome.");
      }
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    let final = ""; transcriptRef.current = "";
    rec.onstart = () => { setPhase("recording"); setTranscript(""); setResult(null); setEdited(null); startTimer(); };
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      const full = final + interim;
      transcriptRef.current = full;
      setTranscript(full);
    };
    rec.onerror = (e) => {
      stopTimer(); setPhase("idle");
      if (e.error !== "aborted") setError(e.error === "no-speech" ? "No speech detected. Try speaking louder." : `Recording error: ${e.error}. Try again.`);
    };
    rec.onend = () => { stopTimer(); setStoppedRecording(true); };
    recRef.current = rec; rec.start();
  }

  function stopRecording() { recRef.current?.stop(); }

  function saveLog() {
    if (!edited) return;
    const entry = {
      id: Date.now().toString(),
      category: edited.category || "behavioral",
      summary: edited.summary,
      description: edited.description,
      action: edited.action,
      followup: edited.followup,
      districtId: edited.districtId,
      behavior_referral: edited.behavior_referral || null,
      osr5_statement: edited.osr5_statement || null,
      district_report: edited.district_report || null,
      nj_report: edited.nj_report || null,
      pa_report: edited.pa_report || null,
      createdAt: new Date().toISOString(),
    };
    const updated = [entry, ...logs];
    saveLogs(updated); setLogs(updated); bumpUsage();
    setPhase("idle"); setResult(null); setEdited(null);
    setTranscript(""); transcriptRef.current = "";
    toast_("✓ Log saved");
    setTab("home");
  }

  function discard() {
    setPhase("idle"); setResult(null); setEdited(null);
    setTranscript(""); transcriptRef.current = ""; setAiError("");
  }

  function deleteLog(id) {
    const updated = logs.filter(l => l.id !== id);
    saveLogs(updated); setLogs(updated);
    toast_("Log deleted");
  }

  function buildPortalText(log) {
    const c = CATS[log.category];
    return ["LOGIT DOCUMENTATION REPORT","─".repeat(40),`Category:   ${c?.label || log.category}`,`Date/Time:  ${new Date(log.createdAt).toLocaleString()}`,"","SUMMARY",log.summary,"","INCIDENT DESCRIPTION",log.description,"","ACTION TAKEN",log.action,"","FOLLOW-UP",log.followup,"","─".repeat(40),"Generated by LogIt · CieroLink LLC","All student names replaced per FERPA guidelines"].join("\n");
  }

  function copyForPortal(log) {
    navigator.clipboard?.writeText(buildPortalText(log));
    toast_("✓ Copied for portal");
  }

  function copyCurrentForPortal() {
    if (!edited) return;
    const fakeLog = { ...edited, createdAt: new Date().toISOString() };
    navigator.clipboard?.writeText(buildPortalText(fakeLog));
    toast_("✓ Copied for portal");
  }

  const usage = getUsage();
  const cat = edited ? CATS[edited.category] : null;

  // Show result over whichever tab is active
  const showResult = phase === "result" && edited && cat;
  const showProcessing = phase === "processing";
  const showRecording = phase === "recording";
  const showLimit = phase === "limit";

  const TABS = [
    { id: "home",   icon: "🏠", label: "Home" },
    { id: "record", icon: "🎙️", label: "Record" },
    { id: "logs",   icon: "📋", label: "Logs" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <div className="li-app">
      <div className="li-shell" style={{background:(showRecording||showProcessing||showLimit||showResult||tab==="record"||tab==="logs"||tab==="settings")?'#111118':'#F8FAFF',border:(showRecording||showProcessing||showLimit||showResult||tab==="record"||tab==="logs"||tab==="settings")?'1px solid rgba(255,255,255,0.07)':'1px solid rgba(10,15,30,0.1)'}}>

        <div className="li-statusbar" style={{background:(showRecording||showProcessing||showLimit||showResult||tab==="record"||tab==="logs"||tab==="settings")?'#111118':'#F8FAFF'}}>
          <div className="li-wordmark">
            <svg width="80" height="28" viewBox="0 0 80 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="28" height="28" rx="6" fill="#E63946"/>
              <text x="14" y="21" textAnchor="middle" fontFamily="Georgia,serif" fontSize="17" fontWeight="700" fill="white">L</text>
              <text x="35" y="21" fontFamily="Georgia,serif" fontSize="17" fontWeight="700" fill={(showRecording||showProcessing||showLimit||showResult||tab==="record"||tab==="logs")?"white":"#0A0F1E"}>ogIt</text>
            </svg>
          </div>
          <div className="li-counter" style={{color:(showRecording||showProcessing||showLimit||showResult||tab==="record"||tab==="logs"||tab==="settings")?'rgba(255,255,255,0.25)':'#7A8AAA'}}>{usage}/{FREE_LIMIT}</div>
        </div>

        {error && phase === "idle" && <div className="li-error">{error}</div>}

        {/* ── RESULT (shown over any tab) ── */}
        {showResult && (
          <div className="li-result">
            <div className="li-result-top">
              <div className="li-cat-badge" style={{ background: cat.bg, color: cat.color }}>{cat.label}</div>
              <div className="li-result-summary">{edited.summary}</div>
            </div>
            {aiError && (
              <div className="li-ai-error">
                ⚠ {aiError}
                <button className="li-reformat" style={{ marginTop: 8 }} onClick={processTranscript}>↻ Try again</button>
              </div>
            )}
            <div className="li-result-scroll-wrap">
              <div className="li-result-scroll">
                {[["Description","description",3],["Action taken","action",2],["Follow-up","followup",2]].map(([lbl,key,rows]) => (
                  <div key={key} className="li-field">
                    <div className="li-field-label">{lbl}</div>
                    <textarea className="li-field-val" value={edited[key]||""} rows={rows} onChange={e=>setEdited({...edited,[key]:e.target.value})} />
                  </div>
                ))}
                <div className="li-field">
                  <div className="li-field-label">Category</div>
                  <select className="li-field-select" value={edited.category||"behavioral"} onChange={e=>setEdited({...edited,category:e.target.value})}>
                    {Object.entries(CATS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <DistrictForms edited={edited} />
            <div className="li-ferpa-note">🔒 Student names replaced · Stored locally only</div>
            <div className="li-report-actions">
              <button className="li-copy-main" onClick={copyCurrentForPortal}>Copy for Portal</button>
            </div>
            <div className="li-pro-panel li-pro-panel-result">
              <div className="li-pro-heading"><span className="li-pro-crown">♛</span>Included with Pro</div>
              <div className="li-pro-grid">
                {["Export PDF", "Email Admin", "Parent Email", "Backup"].map(label => (
                  <button className="li-pro-btn" type="button" key={label} onClick={() => setShowProModal(true)}>
                    <span className="li-pro-crown">♛</span>{label}
                  </button>
                ))}
              </div>
            </div>
            <div className="li-result-actions">
              <button className="li-save" onClick={saveLog}>Save Log</button>
              <button className="li-discard" onClick={discard}>Discard</button>
            </div>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {showProcessing && (
          <div className="li-processing">
            <div className="li-spinner" />
            <div className="li-proc-text">Formatting your report…</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:6}}>Usually takes 3-5 seconds</div>
          </div>
        )}

        {/* ── RECORDING ── */}
        {showRecording && (
          <div className="li-recording" onClick={stopRecording}>
            <div className="li-rec-dot" />
            <div className="li-timer">{fmt(secs)}</div>
            <div className={`li-transcript-live${transcript?" has-text":""}`}>{transcript||"Listening…"}</div>
            <div className="li-stop-hint">Tap anywhere to stop</div>
          </div>
        )}

        {showLimit && (
          <LimitScreen onDismiss={()=>setPhase("idle")} usage={usage} />
        )}

        {/* ── TAB CONTENT (hidden during recording/processing/result/limit) ── */}
        {showProModal && <ProUpgradeModal onClose={() => setShowProModal(false)} />}

        {!showResult && !showProcessing && !showRecording && !showLimit && (
          <>
            {tab === "home" && (
              <HomeScreen
                logs={logs}
                usage={usage}
                onStartLogging={() => setTab("record")}
                district={district}
                onDistrictChange={handleDistrictChange}
              />
            )}
            {tab === "record" && (
              <div className="li-idle" onClick={handleTap}>
                <div className="li-ring li-ring-1" />
                <div className="li-ring li-ring-2" />
                <div className="li-ring li-ring-3" />
                <div className="li-mic">🎙️</div>
                <div className="li-tap-hint">Tap to log</div>
              </div>
            )}
            {tab === "logs" && (
              <LogsScreen logs={logs} onDelete={deleteLog} onCopy={copyForPortal} />
            )}
            {tab === "settings" && (
              <SettingsScreen usage={usage} onUpgrade={()=>setPhase("limit")} />
            )}
          </>
        )}

        {/* ── TAB BAR ── */}
        {!showRecording && !showProcessing && (
          <div className="li-tabbar" style={{borderTop:(showResult||showLimit||tab==="record"||tab==="logs"||tab==="settings")?'1px solid rgba(255,255,255,0.08)':'1px solid #E0E8F5',background:(showResult||showLimit||tab==="record"||tab==="logs"||tab==="settings")?'#111118':'#FFFFFF'}}>
            {TABS.map(t => (
              <button
                key={t.id}
                className={`li-tab ${tab === t.id ? "active" : "inactive"}`}
                onClick={() => {
                  if (showResult) discard();
                  if (showLimit) setPhase("idle");
                  setTab(t.id);
                }}
              >
                <div className="li-tab-icon" style={{opacity:tab===t.id?1:0.35}}>{t.icon}</div>
                <div className="li-tab-label" style={{color:(showResult||showLimit||tab==="record"||tab==="logs"||tab==="settings")?(tab===t.id?'white':'rgba(255,255,255,0.3)'):(tab===t.id?'#185FA5':'#8899BB')}}>{t.label}</div>
              </button>
            ))}
          </div>
        )}

        {toast && <div className="li-toast">{toast}</div>}
      </div>
    </div>
  );
}

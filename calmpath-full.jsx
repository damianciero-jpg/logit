import { useState, useEffect, useRef } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

// ── Shared Data ──────────────────────────────────────────────────────────────
const CHILDREN = [
  {
    id: 1, name: "Jordan", age: 8, avatar: "👦", color: "#6366F1",
    parent: "Lisa M.", therapist: "Dr. Chen",
    sessions: [
      { date: "Mon", mood: "happy",   stars: 3, time: "3:45 PM", game: "Star Collector" },
      { date: "Mon", mood: "calm",    stars: 3, time: "4:10 PM", game: "Bubble Breath"  },
      { date: "Tue", mood: "anxious", stars: 2, time: "8:12 AM", game: "Cloud Catcher"  },
      { date: "Tue", mood: "angry",   stars: 1, time: "3:55 PM", game: "Volcano Stomp"  },
      { date: "Tue", mood: "anxious", stars: 2, time: "5:30 PM", game: "Cloud Catcher"  },
      { date: "Wed", mood: "happy",   stars: 3, time: "9:00 AM", game: "Star Collector" },
      { date: "Wed", mood: "calm",    stars: 3, time: "2:20 PM", game: "Bubble Breath"  },
      { date: "Thu", mood: "sad",     stars: 2, time: "7:45 AM", game: "Rainbow Painter"},
      { date: "Thu", mood: "tired",   stars: 1, time: "3:30 PM", game: "Dream Catch"    },
      { date: "Thu", mood: "angry",   stars: 2, time: "6:00 PM", game: "Volcano Stomp"  },
      { date: "Fri", mood: "happy",   stars: 3, time: "8:30 AM", game: "Star Collector" },
      { date: "Fri", mood: "calm",    stars: 3, time: "4:00 PM", game: "Bubble Breath"  },
      { date: "Sat", mood: "happy",   stars: 3, time: "10:15 AM", game: "Star Collector"},
      { date: "Sat", mood: "happy",   stars: 3, time: "2:00 PM", game: "Star Collector" },
      { date: "Sun", mood: "calm",    stars: 3, time: "11:00 AM", game: "Bubble Breath" },
    ],
    iepGoals: ["Emotional regulation: 4/5", "Communication: 3/5", "Social skills: 3/5", "Sensory tolerance: 4/5"],
    notes: "Jordan responds well to morning sessions. Afternoon frustration patterns noted on school days.",
  },
  {
    id: 2, name: "Mia", age: 6, avatar: "👧", color: "#EC4899",
    parent: "Tom K.", therapist: "Dr. Chen",
    sessions: [
      { date: "Mon", mood: "calm",    stars: 3, time: "9:00 AM", game: "Bubble Breath"  },
      { date: "Mon", mood: "happy",   stars: 3, time: "3:00 PM", game: "Star Collector" },
      { date: "Tue", mood: "sad",     stars: 2, time: "8:00 AM", game: "Rainbow Painter"},
      { date: "Tue", mood: "anxious", stars: 1, time: "4:00 PM", game: "Cloud Catcher"  },
      { date: "Wed", mood: "happy",   stars: 3, time: "10:00 AM", game: "Star Collector"},
      { date: "Thu", mood: "calm",    stars: 3, time: "9:30 AM", game: "Bubble Breath"  },
      { date: "Thu", mood: "angry",   stars: 1, time: "3:45 PM", game: "Volcano Stomp"  },
      { date: "Fri", mood: "happy",   stars: 3, time: "8:00 AM", game: "Star Collector" },
      { date: "Sat", mood: "calm",    stars: 3, time: "11:00 AM", game: "Bubble Breath" },
    ],
    iepGoals: ["Emotional regulation: 3/5", "Communication: 4/5", "Social skills: 2/5", "Sensory tolerance: 3/5"],
    notes: "Mia thrives in morning routines. Afternoon transitions are a challenge, especially Tuesdays.",
  },
  {
    id: 3, name: "Eli", age: 10, avatar: "🧒", color: "#F59E0B",
    parent: "Rosa P.", therapist: "Dr. Chen",
    sessions: [
      { date: "Mon", mood: "angry",   stars: 1, time: "7:50 AM", game: "Volcano Stomp"  },
      { date: "Mon", mood: "anxious", stars: 2, time: "3:30 PM", game: "Cloud Catcher"  },
      { date: "Tue", mood: "calm",    stars: 3, time: "9:00 AM", game: "Bubble Breath"  },
      { date: "Wed", mood: "angry",   stars: 1, time: "7:45 AM", game: "Volcano Stomp"  },
      { date: "Wed", mood: "tired",   stars: 2, time: "3:00 PM", game: "Dream Catch"    },
      { date: "Thu", mood: "happy",   stars: 3, time: "10:00 AM", game: "Star Collector"},
      { date: "Fri", mood: "anxious", stars: 2, time: "8:00 AM", game: "Cloud Catcher"  },
      { date: "Fri", mood: "angry",   stars: 1, time: "3:45 PM", game: "Volcano Stomp"  },
      { date: "Sat", mood: "happy",   stars: 3, time: "9:00 AM", game: "Star Collector" },
    ],
    iepGoals: ["Emotional regulation: 2/5", "Communication: 3/5", "Social skills: 3/5", "Sensory tolerance: 2/5"],
    notes: "Eli shows a consistent Monday morning frustration pattern. Peer interactions at school may be a trigger.",
  },
];

const MOOD_META = {
  happy:   { emoji: "😄", label: "Happy",      color: "#F59E0B", light: "#FEF3C7", score: 5 },
  calm:    { emoji: "😌", label: "Calm",       color: "#10B981", light: "#D1FAE5", score: 4 },
  tired:   { emoji: "😴", label: "Tired",      color: "#F97316", light: "#FFEDD5", score: 3 },
  sad:     { emoji: "😢", label: "Sad",        color: "#8B5CF6", light: "#EDE9FE", score: 2 },
  anxious: { emoji: "😟", label: "Worried",    color: "#3B82F6", light: "#DBEAFE", score: 2 },
  angry:   { emoji: "😠", label: "Frustrated", color: "#EF4444", light: "#FEE2E2", score: 1 },
};

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function buildChartData(sessions) {
  return DAYS.map(day => {
    const ds = sessions.filter(s => s.date === day);
    return {
      day,
      score: ds.length ? parseFloat((ds.reduce((a,s) => a + MOOD_META[s.mood].score, 0) / ds.length).toFixed(1)) : null,
      count: ds.length,
    };
  });
}

function buildMoodBreakdown(sessions) {
  const counts = {};
  sessions.forEach(s => { counts[s.mood] = (counts[s.mood]||0)+1; });
  return Object.entries(counts).map(([mood,value]) => ({ mood, value, ...MOOD_META[mood] })).sort((a,b)=>b.value-a.value);
}

function stressCount(sessions) {
  return sessions.filter(s => ["anxious","angry","sad"].includes(s.mood)).length;
}

// ── Notification Engine ──────────────────────────────────────────────────────
function generateNotifications(children) {
  const notifs = [];
  children.forEach(child => {
    const sessions = child.sessions;
    const stress = stressCount(sessions);
    const recentAngry = sessions.filter(s => s.date === "Thu" && s.mood === "angry");
    const morningStress = sessions.filter(s => {
      const hour = parseInt(s.time.split(":")[0]);
      const isPM = s.time.includes("PM");
      const h24 = isPM && hour !== 12 ? hour+12 : hour;
      return h24 < 10 && ["anxious","angry","sad"].includes(s.mood);
    });
    const avgStars = sessions.reduce((a,s)=>a+s.stars,0)/sessions.length;

    if (stress >= 4) {
      notifs.push({
        id: `${child.id}-stress`,
        childId: child.id,
        childName: child.name,
        childAvatar: child.avatar,
        type: "alert",
        title: `${child.name} had ${stress} stress sessions this week`,
        body: "Elevated frustration and worry patterns detected. Consider checking in.",
        time: "2 min ago",
        read: false,
        color: "#EF4444",
        icon: "⚠️",
      });
    }
    if (morningStress.length >= 2) {
      notifs.push({
        id: `${child.id}-morning`,
        childId: child.id,
        childName: child.name,
        childAvatar: child.avatar,
        type: "pattern",
        title: `Morning stress pattern for ${child.name}`,
        body: `${morningStress.length} difficult morning sessions detected. May align with school schedule.`,
        time: "1 hr ago",
        read: false,
        color: "#F97316",
        icon: "🌅",
      });
    }
    if (avgStars >= 2.8) {
      notifs.push({
        id: `${child.id}-great`,
        childId: child.id,
        childName: child.name,
        childAvatar: child.avatar,
        type: "positive",
        title: `Great week for ${child.name}! 🌟`,
        body: `Average of ${avgStars.toFixed(1)} stars across ${sessions.length} sessions. Keep it up!`,
        time: "3 hr ago",
        read: true,
        color: "#10B981",
        icon: "🎉",
      });
    }
    if (recentAngry.length > 0) {
      notifs.push({
        id: `${child.id}-thursday`,
        childId: child.id,
        childName: child.name,
        childAvatar: child.avatar,
        type: "pattern",
        title: `Thursday afternoon trend — ${child.name}`,
        body: "Frustrated mood logged Thursday evenings for 2+ weeks. May be post-school fatigue.",
        time: "Yesterday",
        read: true,
        color: "#8B5CF6",
        icon: "📅",
      });
    }
  });
  return notifs.sort((a,b) => (a.read === b.read ? 0 : a.read ? 1 : -1));
}

// ── Radar/Wellness data ──────────────────────────────────────────────────────
function buildRadarData(sessions) {
  const total = sessions.length || 1;
  const happyCalm = sessions.filter(s=>["happy","calm"].includes(s.mood)).length;
  const stressS = stressCount(sessions);
  const avgStars = sessions.reduce((a,s)=>a+s.stars,0)/total;
  const morningGood = sessions.filter(s => {
    const isPM = s.time.includes("PM");
    const h = parseInt(s.time.split(":")[0]);
    const h24 = isPM && h!==12 ? h+12 : h;
    return h24 < 12 && ["happy","calm"].includes(s.mood);
  }).length;
  return [
    { subject: "Regulation",  A: Math.round((happyCalm/total)*100) },
    { subject: "Engagement",  A: Math.round((avgStars/3)*100)      },
    { subject: "Consistency", A: Math.min(100, total * 7)           },
    { subject: "Morning",     A: Math.round((morningGood/Math.max(1,sessions.filter(s=>{const h=parseInt(s.time);return !s.time.includes("PM")||h===12;}).length))*100) },
    { subject: "Recovery",    A: Math.max(0, 100 - Math.round((stressS/total)*100)) },
  ];
}

// ── PDF Report (HTML print) ──────────────────────────────────────────────────
function openPDFReport(child) {
  const breakdown = buildMoodBreakdown(child.sessions);
  const avgStars = (child.sessions.reduce((a,s)=>a+s.stars,0)/child.sessions.length).toFixed(1);
  const stress = stressCount(child.sessions);
  const chartD = buildChartData(child.sessions);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>CalmPath Report — ${child.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Outfit', sans-serif; background: white; color: #0F172A; padding: 40px; max-width: 800px; margin: 0 auto; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid ${child.color}; padding-bottom: 20px; margin-bottom: 28px; }
  .brand { font-family: 'DM Serif Display', serif; font-size: 28px; color: ${child.color}; }
  .sub { font-size: 12px; color: #94A3B8; margin-top: 2px; }
  .child-info { text-align: right; }
  .child-name { font-size: 20px; font-weight: 700; }
  .section { margin-bottom: 28px; }
  .section-title { font-family: 'DM Serif Display', serif; font-size: 18px; color: #0F172A; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 1px solid #E2E8F0; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .stat-card { background: #F8FAFC; border-radius: 12px; padding: 14px; border-left: 4px solid ${child.color}; }
  .stat-val { font-size: 24px; font-weight: 700; color: #0F172A; }
  .stat-lbl { font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 3px; }
  .mood-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #F1F5F9; }
  .bar-bg { flex: 1; height: 8px; background: #F1F5F9; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; }
  .mood-badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .log-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .log-table th { background: #F8FAFC; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #94A3B8; }
  .log-table td { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; }
  .goal-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F1F5F9; font-size: 14px; }
  .notes-box { background: #F8FAFC; border-radius: 12px; padding: 16px; font-size: 14px; line-height: 1.6; color: #475569; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #CBD5E1; border-top: 1px solid #F1F5F9; padding-top: 16px; }
  .alert-box { background: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #7F1D1D; margin-bottom: 10px; }
  .good-box  { background: #F0FDF4; border-left: 4px solid #10B981; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #14532D; margin-bottom: 10px; }
  .print-btn { position: fixed; top: 20px; right: 20px; background: ${child.color}; color: white; border: none; border-radius: 10px; padding: 12px 24px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 4px 20px ${child.color}44; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save PDF</button>

<div class="header">
  <div>
    <div class="brand">🧩 CalmPath</div>
    <div class="sub">Therapy Progress Report · Generated ${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
  </div>
  <div class="child-info">
    <div class="child-name">${child.avatar} ${child.name}, Age ${child.age}</div>
    <div class="sub">Therapist: ${child.therapist} · Parent: ${child.parent}</div>
    <div class="sub">Report Period: This Week · ${child.sessions.length} Sessions</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Weekly Summary</div>
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-val">${child.sessions.length}</div><div class="stat-lbl">Total Sessions</div></div>
    <div class="stat-card"><div class="stat-val">${avgStars}</div><div class="stat-lbl">Avg Stars (of 3)</div></div>
    <div class="stat-card"><div class="stat-val">${child.sessions.filter(s=>["happy","calm"].includes(s.mood)).length}</div><div class="stat-lbl">Positive Moods</div></div>
    <div class="stat-card"><div class="stat-val">${stress}</div><div class="stat-lbl">Stress Events</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Mood Distribution</div>
  ${breakdown.map(m => `
    <div class="mood-row">
      <span style="font-size:18px">${m.emoji}</span>
      <span style="font-weight:600;width:90px;font-size:13px">${m.label}</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${(m.value/child.sessions.length)*100}%;background:${m.color}"></div></div>
      <span style="font-size:13px;color:#94A3B8;width:40px;text-align:right">${m.value}x</span>
    </div>
  `).join("")}
</div>

<div class="section">
  <div class="section-title">Key Observations</div>
  ${stress >= 4 ? `<div class="alert-box">⚠️ <strong>Elevated stress pattern:</strong> ${stress} stress-category sessions logged this week. Review daily triggers with parent.</div>` : ""}
  ${parseFloat(avgStars) >= 2.5 ? `<div class="good-box">✅ <strong>Strong engagement:</strong> Average star rating of ${avgStars}/3 indicates good session quality and follow-through.</div>` : ""}
  ${child.sessions.filter(s=>s.date==="Tue"&&["anxious","angry"].includes(s.mood)).length >= 2 ? `<div class="alert-box">📅 <strong>Tuesday pattern:</strong> Multiple stress events logged on Tuesdays. May correlate with school schedule or transitions.</div>` : ""}
  <div class="good-box">🎮 <strong>Most-played game:</strong> ${[...child.sessions].sort((a,b)=>child.sessions.filter(s=>s.game===b.game).length - child.sessions.filter(s=>s.game===a.game).length)[0]?.game} — child demonstrates preference for this regulation tool.</div>
</div>

<div class="section">
  <div class="section-title">IEP Goal Progress</div>
  ${child.iepGoals.map(g => `<div class="goal-row"><span>${g.split(":")[0]}</span><span style="font-weight:700;color:${child.color}">${g.split(":")[1]?.trim()}</span></div>`).join("")}
</div>

<div class="section">
  <div class="section-title">Session Log</div>
  <table class="log-table">
    <thead><tr><th>Day</th><th>Time</th><th>Mood</th><th>Game</th><th>Stars</th></tr></thead>
    <tbody>
      ${[...child.sessions].reverse().map(s => {
        const m = MOOD_META[s.mood];
        return `<tr>
          <td style="font-weight:600">${s.date}</td>
          <td style="color:#94A3B8">${s.time}</td>
          <td><span class="mood-badge" style="background:${m.light};color:${m.color}">${m.emoji} ${m.label}</span></td>
          <td style="color:#475569">${s.game}</td>
          <td>${"⭐".repeat(s.stars)}</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">Therapist Notes</div>
  <div class="notes-box">${child.notes}</div>
</div>

<div class="footer">
  CalmPath · Confidential Therapy Progress Report · ${child.name} · Do not distribute without parental consent
</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

// ── UI Components ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length && payload[0].value !== null) {
    const score = payload[0].value;
    const emoji = score>=4.5?"😄":score>=3.5?"😌":score>=2.5?"😴":score>=1.5?"😟":"😠";
    return (
      <div style={{ background:"white", borderRadius:"10px", padding:"8px 12px", boxShadow:"0 4px 16px rgba(0,0,0,0.12)", fontFamily:"'Outfit',sans-serif", fontSize:"13px" }}>
        <strong>{label}</strong> · {emoji} {score}/5
      </div>
    );
  }
  return null;
};

export default function CalmPathApp() {
  const [view, setView] = useState("notifications"); // notifications | therapist | report
  const [notifications, setNotifications] = useState(() => generateNotifications(CHILDREN));
  const [selectedChild, setSelectedChild] = useState(CHILDREN[0]);
  const [notifFilter, setNotifFilter] = useState("all");
  const [aiNotes, setAiNotes] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const unread = notifications.filter(n => !n.read).length;

  function showToast(msg, color="#10B981") {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  }

  function markRead(id) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }
  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast("All notifications marked as read");
  }
  function dismissNotif(id) {
    setNotifications(prev => prev.filter(n => n.id !== id));
    showToast("Notification dismissed");
  }

  async function fetchAINotes(child) {
    if (aiNotes[child.id]) return;
    setAiLoading(true);
    try {
      const summary = child.sessions.map(s => `${s.date} ${s.time}: ${s.mood}, ${s.stars} stars`).join("; ");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a child behavioral therapist assistant analyzing a week of app data for a child with autism.

Child: ${child.name}, age ${child.age}
Session data: ${summary}
IEP Goals: ${child.iepGoals.join(", ")}

Return ONLY a JSON object (no markdown) with:
{
  "clinicalSummary": "2-3 sentence clinical summary for the therapist",
  "patterns": ["pattern 1", "pattern 2", "pattern 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "parentTalkingPoints": ["point 1", "point 2"]
}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type==="text")?.text || "{}";
      const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
      setAiNotes(prev => ({ ...prev, [child.id]: parsed }));
    } catch(e) {
      setAiNotes(prev => ({ ...prev, [child.id]: { error: true } }));
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    if (view === "therapist") fetchAINotes(selectedChild);
  }, [view, selectedChild]);

  const filteredNotifs = notifFilter === "all"
    ? notifications
    : notifFilter === "unread"
    ? notifications.filter(n => !n.read)
    : notifications.filter(n => n.type === notifFilter);

  const notes = aiNotes[selectedChild.id];
  const radarData = buildRadarData(selectedChild.sessions);
  const chartData = buildChartData(selectedChild.sessions);
  const breakdown = buildMoodBreakdown(selectedChild.sessions);

  const NAV = [
    { id:"notifications", label:"Notifications", icon:"🔔", badge: unread },
    { id:"therapist",     label:"Therapist View", icon:"🩺", badge: null  },
    { id:"report",        label:"Reports",        icon:"📄", badge: null  },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ping { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .nav-btn:hover { background:#F1F5F9 !important; }
        .notif-card:hover { box-shadow:0 4px 20px rgba(0,0,0,0.1) !important; }
        .child-tab:hover { background:#F8FAFC !important; }
        .action-btn:hover { opacity:0.8; }
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:#F1F5F9} ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed", bottom:"24px", left:"50%", transform:"translateX(-50%)",
          background:toast.color, color:"white", borderRadius:"12px",
          padding:"12px 24px", fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:"14px",
          zIndex:9999, boxShadow:"0 8px 30px rgba(0,0,0,0.2)", animation:"toastIn 0.3s ease",
        }}>{toast.msg}</div>
      )}

      <div style={{ minHeight:"100vh", background:"#F8FAFC", fontFamily:"'Outfit',sans-serif", display:"flex", flexDirection:"column" }}>

        {/* HEADER */}
        <div style={{ background:"white", borderBottom:"1px solid #E2E8F0", padding:"0 1.5rem", boxShadow:"0 1px 8px rgba(15,23,42,0.05)", position:"sticky", top:0, zIndex:50 }}>
          <div style={{ maxWidth:"960px", margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:"60px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:"linear-gradient(135deg,#6366F1,#8B5CF6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem" }}>🧩</div>
              <div>
                <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.25rem", color:"#0F172A", lineHeight:1 }}>CalmPath</div>
                <div style={{ fontSize:"0.65rem", color:"#94A3B8", fontWeight:500 }}>Professional Suite</div>
              </div>
            </div>
            <nav style={{ display:"flex", gap:"4px" }}>
              {NAV.map(n => (
                <button key={n.id} className="nav-btn" onClick={()=>setView(n.id)} style={{
                  display:"flex", alignItems:"center", gap:"6px",
                  padding:"8px 14px", background:"none", border:"none",
                  borderRadius:"10px", cursor:"pointer",
                  fontFamily:"'Outfit',sans-serif", fontWeight:view===n.id?700:500,
                  fontSize:"0.83rem",
                  color:view===n.id?"#6366F1":"#64748B",
                  background:view===n.id?"#EEF2FF":"none",
                  transition:"all 0.15s", position:"relative",
                }}>
                  {n.icon} {n.label}
                  {n.badge > 0 && (
                    <span style={{ background:"#EF4444", color:"white", borderRadius:"20px", padding:"1px 6px", fontSize:"0.68rem", fontWeight:800, animation:"ping 2s ease infinite" }}>
                      {n.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div style={{ maxWidth:"960px", margin:"0 auto", padding:"1.5rem", width:"100%", flex:1 }}>

          {/* ── NOTIFICATIONS ── */}
          {view === "notifications" && (
            <div style={{ animation:"fadeUp 0.4s ease" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
                <div>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.5rem", color:"#0F172A" }}>Notifications</div>
                  <div style={{ fontSize:"0.78rem", color:"#94A3B8", marginTop:"2px" }}>{unread} unread · Smart alerts from your children's sessions</div>
                </div>
                <button onClick={markAllRead} style={{ background:"#F1F5F9", border:"none", borderRadius:"10px", padding:"8px 16px", fontFamily:"'Outfit',sans-serif", fontWeight:600, fontSize:"0.82rem", color:"#475569", cursor:"pointer" }}>
                  Mark all read
                </button>
              </div>

              {/* Filter pills */}
              <div style={{ display:"flex", gap:"8px", marginBottom:"1.25rem", flexWrap:"wrap" }}>
                {[
                  { id:"all",      label:"All" },
                  { id:"unread",   label:"Unread" },
                  { id:"alert",    label:"⚠️ Alerts" },
                  { id:"pattern",  label:"📅 Patterns" },
                  { id:"positive", label:"✅ Wins" },
                ].map(f => (
                  <button key={f.id} onClick={()=>setNotifFilter(f.id)} style={{
                    padding:"6px 14px", borderRadius:"20px", border:"none", cursor:"pointer",
                    background:notifFilter===f.id?"#6366F1":"white",
                    color:notifFilter===f.id?"white":"#64748B",
                    fontFamily:"'Outfit',sans-serif", fontWeight:600, fontSize:"0.8rem",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.08)", transition:"all 0.15s",
                  }}>{f.label} {f.id==="all"?`(${notifications.length})`:f.id==="unread"?`(${unread})`:""}</button>
                ))}
              </div>

              {filteredNotifs.length === 0 && (
                <div style={{ textAlign:"center", padding:"3rem", color:"#CBD5E1", fontSize:"1rem" }}>
                  🎉 All caught up!
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                {filteredNotifs.map((n, i) => (
                  <div key={n.id} className="notif-card" onClick={()=>markRead(n.id)} style={{
                    background:"white", borderRadius:"16px", padding:"1rem 1.25rem",
                    boxShadow: n.read ? "0 1px 6px rgba(0,0,0,0.05)" : "0 2px 16px rgba(99,102,241,0.12)",
                    borderLeft:`4px solid ${n.read ? "#E2E8F0" : n.color}`,
                    cursor:"pointer", transition:"box-shadow 0.2s",
                    animation:`fadeUp 0.4s ease both`, animationDelay:`${i*0.05}s`,
                    opacity: n.read ? 0.75 : 1,
                  }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:"12px" }}>
                      <div style={{ width:"40px", height:"40px", borderRadius:"50%", background:n.read?"#F1F5F9":`${n.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem", flexShrink:0 }}>
                        {n.icon}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px" }}>
                          <div style={{ fontWeight:700, fontSize:"0.88rem", color:"#0F172A", lineHeight:1.3 }}>
                            {!n.read && <span style={{ display:"inline-block", width:"7px", height:"7px", borderRadius:"50%", background:n.color, marginRight:"6px", verticalAlign:"middle" }} />}
                            {n.title}
                          </div>
                          <div style={{ fontSize:"0.72rem", color:"#94A3B8", flexShrink:0 }}>{n.time}</div>
                        </div>
                        <div style={{ fontSize:"0.82rem", color:"#64748B", marginTop:"4px", lineHeight:1.5 }}>{n.body}</div>
                        <div style={{ display:"flex", gap:"8px", marginTop:"10px" }}>
                          <span style={{ background:`${n.color}15`, color:n.color, borderRadius:"20px", padding:"3px 10px", fontSize:"0.72rem", fontWeight:700 }}>
                            {n.childAvatar} {n.childName}
                          </span>
                          <button onClick={(e)=>{e.stopPropagation();dismissNotif(n.id);}} style={{ background:"none", border:"none", color:"#CBD5E1", fontSize:"0.72rem", cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notification settings preview */}
              <div style={{ marginTop:"1.5rem", background:"white", borderRadius:"16px", padding:"1.25rem", boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
                <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1rem", color:"#0F172A", marginBottom:"1rem" }}>Alert Settings</div>
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                  {[
                    { label:"3+ stress sessions in a day",   icon:"⚠️", on:true,  color:"#EF4444" },
                    { label:"Recurring mood patterns",        icon:"📅", on:true,  color:"#8B5CF6" },
                    { label:"Morning distress triggers",      icon:"🌅", on:true,  color:"#F97316" },
                    { label:"Weekly positive milestones",     icon:"🎉", on:true,  color:"#10B981" },
                    { label:"Session completion reminders",   icon:"🔔", on:false, color:"#6366F1" },
                  ].map((s,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:i<4?"1px solid #F1F5F9":"none" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"0.85rem", color:"#374151" }}>
                        <span>{s.icon}</span> {s.label}
                      </div>
                      <div style={{ width:"36px", height:"20px", borderRadius:"10px", background:s.on?s.color:"#E2E8F0", position:"relative", cursor:"pointer" }}>
                        <div style={{ width:"16px", height:"16px", borderRadius:"50%", background:"white", position:"absolute", top:"2px", left:s.on?"18px":"2px", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── THERAPIST VIEW ── */}
          {view === "therapist" && (
            <div style={{ animation:"fadeUp 0.4s ease" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
                <div>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.5rem", color:"#0F172A" }}>Therapist Dashboard</div>
                  <div style={{ fontSize:"0.78rem", color:"#94A3B8", marginTop:"2px" }}>Dr. Chen · {CHILDREN.length} active patients this week</div>
                </div>
              </div>

              {/* Child selector tabs */}
              <div style={{ display:"flex", gap:"10px", marginBottom:"1.5rem", overflowX:"auto", paddingBottom:"4px" }}>
                {CHILDREN.map(child => (
                  <button key={child.id} className="child-tab" onClick={()=>{ setSelectedChild(child); if(view==="therapist") fetchAINotes(child); }} style={{
                    display:"flex", alignItems:"center", gap:"8px", padding:"10px 16px",
                    background:selectedChild.id===child.id?"white":"#F1F5F9",
                    border:`2px solid ${selectedChild.id===child.id?child.color:"transparent"}`,
                    borderRadius:"14px", cursor:"pointer", flexShrink:0,
                    fontFamily:"'Outfit',sans-serif", transition:"all 0.15s",
                    boxShadow: selectedChild.id===child.id ? `0 2px 12px ${child.color}22` : "none",
                  }}>
                    <span style={{ fontSize:"1.4rem" }}>{child.avatar}</span>
                    <div style={{ textAlign:"left" }}>
                      <div style={{ fontWeight:700, fontSize:"0.85rem", color:selectedChild.id===child.id?child.color:"#374151" }}>{child.name}</div>
                      <div style={{ fontSize:"0.72rem", color:"#94A3B8" }}>Age {child.age} · {child.sessions.length} sessions</div>
                    </div>
                    {stressCount(child.sessions) >= 3 && (
                      <span style={{ background:"#FEE2E2", color:"#EF4444", borderRadius:"20px", padding:"2px 7px", fontSize:"0.65rem", fontWeight:800 }}>
                        {stressCount(child.sessions)} alerts
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Child detail */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"14px" }}>

                {/* Mood trend */}
                <div style={{ background:"white", borderRadius:"18px", padding:"1.25rem", boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1rem", color:"#0F172A", marginBottom:"1rem" }}>Mood Trend</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData} margin={{left:-20,right:8,top:4,bottom:0}}>
                      <XAxis dataKey="day" tick={{fontFamily:"'Outfit',sans-serif",fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/>
                      <YAxis domain={[0,5]} ticks={[1,3,5]} tick={{fontSize:10,fill:"#CBD5E1"}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Line type="monotone" dataKey="score" stroke={selectedChild.color} strokeWidth={2.5} dot={{fill:selectedChild.color,r:4,strokeWidth:0}} connectNulls={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Wellness radar */}
                <div style={{ background:"white", borderRadius:"18px", padding:"1.25rem", boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1rem", color:"#0F172A", marginBottom:"0.5rem" }}>Wellness Profile</div>
                  <ResponsiveContainer width="100%" height={170}>
                    <RadarChart data={radarData} margin={{top:0,right:20,bottom:0,left:20}}>
                      <PolarGrid stroke="#F1F5F9"/>
                      <PolarAngleAxis dataKey="subject" tick={{fontFamily:"'Outfit',sans-serif",fontSize:10,fill:"#94A3B8"}}/>
                      <Radar name={selectedChild.name} dataKey="A" stroke={selectedChild.color} fill={selectedChild.color} fillOpacity={0.25} strokeWidth={2}/>
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Clinical Notes */}
              <div style={{ background:"white", borderRadius:"18px", padding:"1.25rem", boxShadow:"0 1px 8px rgba(0,0,0,0.06)", marginBottom:"14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1rem", color:"#0F172A" }}>
                    🧠 AI Clinical Notes — {selectedChild.name}
                  </div>
                  <div style={{ fontSize:"0.72rem", color:"#94A3B8" }}>Powered by Claude</div>
                </div>

                {aiLoading && !notes && (
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                    {[120,80,100,80].map((w,i)=>(
                      <div key={i} style={{ height:"14px", borderRadius:"7px", width:`${w}%`, background:"linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize:"400px 100%", animation:"shimmer 1.4s ease infinite", animationDelay:`${i*0.1}s` }}/>
                    ))}
                  </div>
                )}

                {notes && !notes.error && (
                  <div style={{ display:"flex", flexDirection:"column", gap:"14px", animation:"slideIn 0.4s ease" }}>
                    <div style={{ background:"#F8FAFC", borderRadius:"12px", padding:"12px 16px", fontSize:"0.85rem", color:"#374151", lineHeight:1.6, borderLeft:`3px solid ${selectedChild.color}` }}>
                      {notes.clinicalSummary}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                      <div>
                        <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"8px" }}>Observed Patterns</div>
                        {notes.patterns?.map((p,i)=>(
                          <div key={i} style={{ display:"flex", gap:"6px", fontSize:"0.8rem", color:"#475569", marginBottom:"6px", lineHeight:1.4 }}>
                            <span style={{ color:selectedChild.color, flexShrink:0 }}>•</span>{p}
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"8px" }}>Recommendations</div>
                        {notes.recommendations?.map((r,i)=>(
                          <div key={i} style={{ display:"flex", gap:"6px", fontSize:"0.8rem", color:"#475569", marginBottom:"6px", lineHeight:1.4 }}>
                            <span style={{ color:"#10B981", flexShrink:0 }}>→</span>{r}
                          </div>
                        ))}
                      </div>
                    </div>
                    {notes.parentTalkingPoints?.length > 0 && (
                      <div style={{ background:"#EFF6FF", borderRadius:"12px", padding:"12px 16px" }}>
                        <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#3B82F6", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"8px" }}>Parent Talking Points</div>
                        {notes.parentTalkingPoints.map((p,i)=>(
                          <div key={i} style={{ fontSize:"0.8rem", color:"#1E40AF", marginBottom:"4px", display:"flex", gap:"6px" }}>
                            <span>💬</span>{p}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {notes?.error && (
                  <div style={{ color:"#EF4444", fontSize:"0.85rem" }}>Couldn't load AI notes. <button onClick={()=>fetchAINotes(selectedChild)} style={{ background:"none", border:"none", color:"#6366F1", cursor:"pointer", fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>Retry</button></div>
                )}
              </div>

              {/* IEP Goals */}
              <div style={{ background:"white", borderRadius:"18px", padding:"1.25rem", boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1rem", color:"#0F172A", marginBottom:"1rem" }}>IEP Goal Progress</div>
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                  {selectedChild.iepGoals.map((g,i) => {
                    const [label, score] = g.split(":");
                    const [num, den] = score.trim().split("/").map(Number);
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                        <div style={{ width:"140px", fontSize:"0.82rem", fontWeight:600, color:"#374151", flexShrink:0 }}>{label}</div>
                        <div style={{ flex:1, height:"8px", background:"#F1F5F9", borderRadius:"4px", overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${(num/den)*100}%`, background:selectedChild.color, borderRadius:"4px", transition:"width 0.8s ease" }}/>
                        </div>
                        <div style={{ fontSize:"0.8rem", fontWeight:700, color:selectedChild.color, width:"36px", textAlign:"right" }}>{score.trim()}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {view === "report" && (
            <div style={{ animation:"fadeUp 0.4s ease" }}>
              <div style={{ marginBottom:"1.25rem" }}>
                <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.5rem", color:"#0F172A" }}>Therapy Reports</div>
                <div style={{ fontSize:"0.78rem", color:"#94A3B8", marginTop:"2px" }}>Generate shareable PDF reports for therapy appointments</div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                {CHILDREN.map((child, i) => {
                  const avg = (child.sessions.reduce((a,s)=>a+s.stars,0)/child.sessions.length).toFixed(1);
                  const stress = stressCount(child.sessions);
                  const topMood = buildMoodBreakdown(child.sessions)[0];
                  return (
                    <div key={child.id} style={{
                      background:"white", borderRadius:"20px", padding:"1.5rem",
                      boxShadow:"0 2px 12px rgba(0,0,0,0.06)",
                      animation:`fadeUp 0.4s ease both`, animationDelay:`${i*0.08}s`,
                      borderLeft:`5px solid ${child.color}`,
                    }}>
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"1rem" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                          <div style={{ width:"52px", height:"52px", borderRadius:"50%", background:`${child.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.8rem" }}>
                            {child.avatar}
                          </div>
                          <div>
                            <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.2rem", color:"#0F172A" }}>{child.name}</div>
                            <div style={{ fontSize:"0.78rem", color:"#94A3B8" }}>Age {child.age} · {child.therapist} · Parent: {child.parent}</div>
                          </div>
                        </div>
                        <button onClick={()=>{ openPDFReport(child); showToast(`Opening ${child.name}'s report…`, child.color); }} style={{
                          background:child.color, color:"white", border:"none", borderRadius:"12px",
                          padding:"10px 20px", fontFamily:"'Outfit',sans-serif", fontWeight:700,
                          fontSize:"0.85rem", cursor:"pointer", boxShadow:`0 4px 14px ${child.color}44`,
                          flexShrink:0, transition:"all 0.15s",
                        }}>
                          📄 Generate Report
                        </button>
                      </div>

                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px", marginTop:"1.25rem" }}>
                        {[
                          { label:"Sessions",     value:child.sessions.length, color:child.color },
                          { label:"Avg Stars",    value:`${avg}/3`,            color:"#F59E0B"   },
                          { label:"Top Mood",     value:`${topMood?.emoji} ${topMood?.label}`, color:topMood?.color },
                          { label:"Stress Events",value:stress,                color: stress>=4?"#EF4444":"#10B981" },
                        ].map(s=>(
                          <div key={s.label} style={{ background:"#F8FAFC", borderRadius:"10px", padding:"10px 12px" }}>
                            <div style={{ fontSize:"1.1rem", fontWeight:800, color:s.color }}>{s.value}</div>
                            <div style={{ fontSize:"0.7rem", color:"#94A3B8", marginTop:"2px" }}>{s.label}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop:"1rem", background:"#F8FAFC", borderRadius:"10px", padding:"10px 14px", fontSize:"0.8rem", color:"#475569", lineHeight:1.5 }}>
                        📝 {child.notes}
                      </div>

                      <div style={{ marginTop:"1rem", display:"flex", gap:"8px", flexWrap:"wrap" }}>
                        <span style={{ fontSize:"0.72rem", color:"#94A3B8" }}>Report includes:</span>
                        {["Summary stats","Mood distribution","Session log","IEP progress","Clinical observations","Therapist notes"].map(tag=>(
                          <span key={tag} style={{ background:"#EEF2FF", color:"#6366F1", borderRadius:"20px", padding:"2px 9px", fontSize:"0.7rem", fontWeight:600 }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Report format info */}
              <div style={{ marginTop:"1.5rem", background:"linear-gradient(135deg,#4F46E5,#7C3AED)", borderRadius:"18px", padding:"1.5rem", color:"white" }}>
                <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.1rem", marginBottom:"0.75rem" }}>📋 About CalmPath Reports</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px" }}>
                  {[
                    { icon:"🖨️", label:"Print Ready",     sub:"Optimized for A4 / Letter" },
                    { icon:"🔒", label:"HIPAA Friendly",  sub:"Confidentiality footer included" },
                    { icon:"📊", label:"Data Driven",     sub:"Pulled live from session logs" },
                  ].map(item=>(
                    <div key={item.label} style={{ background:"rgba(255,255,255,0.12)", borderRadius:"12px", padding:"12px" }}>
                      <div style={{ fontSize:"1.4rem", marginBottom:"4px" }}>{item.icon}</div>
                      <div style={{ fontWeight:700, fontSize:"0.85rem" }}>{item.label}</div>
                      <div style={{ fontSize:"0.72rem", opacity:0.7, marginTop:"2px" }}>{item.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

// ── Simulated session data (in production this comes from MoodQuest game logs) ──
const MOCK_SESSIONS = [
  { date: "Mon", mood: "happy", stars: 3, time: "3:45 PM", game: "Star Collector", world: "Sunshine Meadow" },
  { date: "Mon", mood: "calm", stars: 3, time: "4:10 PM", game: "Bubble Breath", world: "Whispering Forest" },
  { date: "Tue", mood: "anxious", stars: 2, time: "8:12 AM", game: "Cloud Catcher", world: "Cloudy Cove" },
  { date: "Tue", mood: "angry", stars: 1, time: "3:55 PM", game: "Volcano Stomp", world: "Volcano Valley" },
  { date: "Tue", mood: "anxious", stars: 2, time: "5:30 PM", game: "Cloud Catcher", world: "Cloudy Cove" },
  { date: "Wed", mood: "happy", stars: 3, time: "9:00 AM", game: "Star Collector", world: "Sunshine Meadow" },
  { date: "Wed", mood: "calm", stars: 3, time: "2:20 PM", game: "Bubble Breath", world: "Whispering Forest" },
  { date: "Thu", mood: "sad", stars: 2, time: "7:45 AM", game: "Rainbow Painter", world: "Rainy Rainbow" },
  { date: "Thu", mood: "tired", stars: 1, time: "3:30 PM", game: "Dream Catch", world: "Sleepy Clouds" },
  { date: "Thu", mood: "angry", stars: 2, time: "6:00 PM", game: "Volcano Stomp", world: "Volcano Valley" },
  { date: "Fri", mood: "happy", stars: 3, time: "8:30 AM", game: "Star Collector", world: "Sunshine Meadow" },
  { date: "Fri", mood: "calm", stars: 3, time: "4:00 PM", game: "Bubble Breath", world: "Whispering Forest" },
  { date: "Sat", mood: "happy", stars: 3, time: "10:15 AM", game: "Star Collector", world: "Sunshine Meadow" },
  { date: "Sat", mood: "happy", stars: 3, time: "2:00 PM", game: "Star Collector", world: "Sunshine Meadow" },
  { date: "Sun", mood: "calm", stars: 3, time: "11:00 AM", game: "Bubble Breath", world: "Whispering Forest" },
];

const MOOD_META = {
  happy:   { emoji: "😄", label: "Happy",      color: "#F59E0B", light: "#FEF3C7" },
  calm:    { emoji: "😌", label: "Calm",       color: "#10B981", light: "#D1FAE5" },
  anxious: { emoji: "😟", label: "Worried",    color: "#3B82F6", light: "#DBEAFE" },
  angry:   { emoji: "😠", label: "Frustrated", color: "#EF4444", light: "#FEE2E2" },
  sad:     { emoji: "😢", label: "Sad",        color: "#8B5CF6", light: "#EDE9FE" },
  tired:   { emoji: "😴", label: "Tired",      color: "#F97316", light: "#FFEDD5" },
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function moodScore(mood) {
  return { happy: 5, calm: 4, tired: 3, sad: 2, anxious: 2, angry: 1 }[mood] ?? 3;
}

function buildChartData(sessions) {
  return DAYS.map((day) => {
    const daySessions = sessions.filter((s) => s.date === day);
    const avg = daySessions.length
      ? daySessions.reduce((a, s) => a + moodScore(s.mood), 0) / daySessions.length
      : null;
    return { day, score: avg ? parseFloat(avg.toFixed(1)) : null, count: daySessions.length };
  });
}

function buildMoodBreakdown(sessions) {
  const counts = {};
  sessions.forEach((s) => { counts[s.mood] = (counts[s.mood] || 0) + 1; });
  return Object.entries(counts).map(([mood, value]) => ({
    mood, value, ...MOOD_META[mood],
  })).sort((a, b) => b.value - a.value);
}

function StatCard({ icon, label, value, sub, color, delay }) {
  return (
    <div style={{
      background: "white",
      borderRadius: "20px",
      padding: "1.25rem 1.5rem",
      boxShadow: "0 2px 16px rgba(15,23,42,0.06)",
      borderLeft: `4px solid ${color}`,
      animation: `fadeUp 0.5s ease both`,
      animationDelay: delay,
    }}>
      <div style={{ fontSize: "1.6rem", marginBottom: "0.4rem" }}>{icon}</div>
      <div style={{ fontSize: "1.8rem", fontFamily: "'DM Serif Display', serif", fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "4px" }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

function InsightCard({ insight, index }) {
  const types = {
    warning: { border: "#EF4444", bg: "#FEF2F2", icon: "⚠️" },
    positive: { border: "#10B981", bg: "#F0FDF4", icon: "✅" },
    info: { border: "#3B82F6", bg: "#EFF6FF", icon: "💡" },
  };
  const t = types[insight.type] || types.info;
  return (
    <div style={{
      background: t.bg,
      borderRadius: "14px",
      padding: "1rem 1.25rem",
      borderLeft: `4px solid ${t.border}`,
      animation: "fadeUp 0.5s ease both",
      animationDelay: `${index * 0.1}s`,
    }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{t.icon}</span>
        <div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "#1E293B", marginBottom: "2px" }}>
            {insight.title}
          </div>
          <div style={{ fontSize: "0.82rem", color: "#475569", lineHeight: 1.5 }}>{insight.body}</div>
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length && payload[0].value !== null) {
    const score = payload[0].value;
    const mood = score >= 4.5 ? "😄" : score >= 3.5 ? "😌" : score >= 2.5 ? "😴" : score >= 1.5 ? "😟" : "😠";
    return (
      <div style={{ background: "white", borderRadius: "12px", padding: "10px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: "2px" }}>{label}</div>
        <div style={{ fontSize: "0.85rem", color: "#64748B" }}>{mood} Score: {score}/5</div>
      </div>
    );
  }
  return null;
};

export default function CalmPathDashboard() {
  const [tab, setTab] = useState("overview");
  const [aiInsights, setAiInsights] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const chartData = buildChartData(MOCK_SESSIONS);
  const moodBreakdown = buildMoodBreakdown(MOCK_SESSIONS);
  const totalSessions = MOCK_SESSIONS.length;
  const avgStars = (MOCK_SESSIONS.reduce((a, s) => a + s.stars, 0) / totalSessions).toFixed(1);
  const topMood = moodBreakdown[0];
  const stressEvents = MOCK_SESSIONS.filter((s) => ["anxious", "angry", "sad"].includes(s.mood)).length;

  const dayDetail = selectedDay
    ? MOCK_SESSIONS.filter((s) => s.date === selectedDay)
    : [];

  const fetchAIInsights = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const summary = MOCK_SESSIONS.map(
        (s) => `${s.date} ${s.time}: mood=${s.mood}, stars=${s.stars}, game=${s.game}`
      ).join("\n");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a compassionate child behavior analyst helping parents of children with autism understand their child's emotional patterns.

Here is one week of mood and game data from the child's MoodQuest app:

${summary}

Analyze this data and return ONLY a JSON array (no markdown, no preamble) with 4 insight objects. Each object must have:
- "type": one of "positive", "warning", or "info"
- "title": short headline (max 8 words)
- "body": 1-2 sentences of warm, helpful, parent-friendly insight

Focus on: time-of-day patterns, day-of-week trends, mood sequences, and actionable suggestions. Be warm and supportive, never alarming.`
          }],
        }),
      });

      const data = await response.json();
      const text = data.content?.find((b) => b.type === "text")?.text || "[]";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setAiInsights(parsed);
    } catch (err) {
      setAiError("Couldn't load insights right now. Try again shortly.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "insights" && aiInsights.length === 0) {
      fetchAIInsights();
    }
  }, [tab]);

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "insights", label: "AI Insights", icon: "🧠" },
    { id: "log", label: "Session Log", icon: "📋" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .tab-btn:hover { background: #F1F5F9 !important; }
        .day-pill:hover { transform: scale(1.06); cursor: pointer; }
        .log-row:hover { background: #F8FAFC !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #F1F5F9; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#F8FAFC",
        fontFamily: "'Outfit', sans-serif",
        color: "#0F172A",
      }}>

        {/* HEADER */}
        <div style={{
          background: "white",
          borderBottom: "1px solid #E2E8F0",
          padding: "0 1.5rem",
          position: "sticky", top: 0, zIndex: 100,
          boxShadow: "0 1px 8px rgba(15,23,42,0.06)",
        }}>
          <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "38px", height: "38px", borderRadius: "10px",
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem",
              }}>🧩</div>
              <div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>
                  CalmPath
                </div>
                <div style={{ fontSize: "0.7rem", color: "#94A3B8", fontWeight: 500 }}>Parent Dashboard</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A" }}>Jordan, age 8</div>
                <div style={{ fontSize: "0.72rem", color: "#94A3B8" }}>This week · 15 sessions</div>
              </div>
              <div style={{
                width: "38px", height: "38px", borderRadius: "50%",
                background: "linear-gradient(135deg, #FDE68A, #F59E0B)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.3rem", boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
              }}>👦</div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "0 1.5rem" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", gap: "4px" }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                className="tab-btn"
                onClick={() => setTab(t.id)}
                style={{
                  padding: "14px 18px",
                  background: "none",
                  border: "none",
                  borderBottom: tab === t.id ? "2px solid #6366F1" : "2px solid transparent",
                  color: tab === t.id ? "#6366F1" : "#64748B",
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: tab === t.id ? 700 : 500,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "6px",
                  transition: "all 0.15s",
                  borderRadius: "6px 6px 0 0",
                  marginBottom: "-1px",
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1.5rem" }}>

          {/* ── OVERVIEW TAB ── */}
          {tab === "overview" && (
            <div style={{ animation: "fadeUp 0.4s ease" }}>

              {/* Stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "1.5rem" }}>
                <StatCard icon="🎮" label="Sessions" value={totalSessions} sub="This week" color="#6366F1" delay="0s" />
                <StatCard icon="⭐" label="Avg Stars" value={avgStars} sub="Out of 3.0" color="#F59E0B" delay="0.08s" />
                <StatCard icon={topMood?.emoji} label="Top Mood" value={topMood?.label} sub={`${topMood?.value} times`} color={topMood?.color} delay="0.16s" />
                <StatCard icon="💛" label="Calm Days" value={`${MOCK_SESSIONS.filter(s => ["happy","calm"].includes(s.mood)).length}`} sub="Happy/Calm logs" color="#10B981" delay="0.24s" />
              </div>

              {/* Mood trend chart */}
              <div style={{ background: "white", borderRadius: "20px", padding: "1.5rem", boxShadow: "0 2px 16px rgba(15,23,42,0.06)", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <div>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", color: "#0F172A" }}>Mood Score This Week</div>
                    <div style={{ fontSize: "0.78rem", color: "#94A3B8", marginTop: "2px" }}>Daily average (5 = Happy, 1 = Frustrated)</div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {[{ l: "Good", c: "#10B981" }, { l: "Neutral", c: "#F59E0B" }, { l: "Tough", c: "#EF4444" }].map((b) => (
                      <div key={b.l} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "#64748B" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: b.c }} />
                        {b.l}
                      </div>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fill: "#CBD5E1" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone" dataKey="score"
                      stroke="#6366F1" strokeWidth={3}
                      dot={{ fill: "#6366F1", r: 5, strokeWidth: 0 }}
                      activeDot={{ r: 7, fill: "#4F46E5" }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Bottom row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

                {/* Mood breakdown */}
                <div style={{ background: "white", borderRadius: "20px", padding: "1.5rem", boxShadow: "0 2px 16px rgba(15,23,42,0.06)" }}>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.1rem", color: "#0F172A", marginBottom: "1rem" }}>
                    Mood Breakdown
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {moodBreakdown.map((m) => (
                      <div key={m.mood} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "1.1rem", width: "24px" }}>{m.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151" }}>{m.label}</span>
                            <span style={{ fontSize: "0.78rem", color: "#94A3B8" }}>{m.value}x</span>
                          </div>
                          <div style={{ height: "6px", background: "#F1F5F9", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: "3px",
                              width: `${(m.value / totalSessions) * 100}%`,
                              background: m.color,
                              transition: "width 0.8s ease",
                            }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day selector detail */}
                <div style={{ background: "white", borderRadius: "20px", padding: "1.5rem", boxShadow: "0 2px 16px rgba(15,23,42,0.06)" }}>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.1rem", color: "#0F172A", marginBottom: "1rem" }}>
                    Day Detail
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "1rem" }}>
                    {DAYS.map((d) => {
                      const hasData = MOCK_SESSIONS.some((s) => s.date === d);
                      return (
                        <button
                          key={d}
                          className="day-pill"
                          onClick={() => setSelectedDay(selectedDay === d ? null : d)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "20px",
                            border: "none",
                            background: selectedDay === d ? "#6366F1" : hasData ? "#EEF2FF" : "#F8FAFC",
                            color: selectedDay === d ? "white" : hasData ? "#4F46E5" : "#CBD5E1",
                            fontFamily: "'Outfit', sans-serif",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            cursor: hasData ? "pointer" : "default",
                            transition: "all 0.15s",
                          }}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                  {selectedDay && dayDetail.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                      {dayDetail.map((s, i) => {
                        const m = MOOD_META[s.mood];
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", background: m.light, borderRadius: "10px" }}>
                            <span style={{ fontSize: "1rem" }}>{m.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1E293B" }}>{s.time} · {m.label}</div>
                              <div style={{ fontSize: "0.72rem", color: "#64748B" }}>{s.game}</div>
                            </div>
                            <div style={{ fontSize: "0.75rem" }}>{"⭐".repeat(s.stars)}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ color: "#CBD5E1", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>
                      Tap a day to see details
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── AI INSIGHTS TAB ── */}
          {tab === "insights" && (
            <div style={{ animation: "fadeUp 0.4s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <div>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "#0F172A" }}>AI Pattern Analysis</div>
                  <div style={{ fontSize: "0.8rem", color: "#94A3B8", marginTop: "2px" }}>Powered by Claude · Based on this week's sessions</div>
                </div>
                <button
                  onClick={fetchAIInsights}
                  disabled={aiLoading}
                  style={{
                    background: aiLoading ? "#F1F5F9" : "#6366F1",
                    color: aiLoading ? "#94A3B8" : "white",
                    border: "none", borderRadius: "12px",
                    padding: "10px 18px", fontFamily: "'Outfit', sans-serif",
                    fontWeight: 700, fontSize: "0.85rem", cursor: aiLoading ? "default" : "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {aiLoading ? "Analyzing…" : "↻ Refresh"}
                </button>
              </div>

              {aiLoading && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{
                      height: "72px", borderRadius: "14px",
                      background: "linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)",
                      backgroundSize: "400px 100%",
                      animation: "shimmer 1.4s ease infinite",
                      animationDelay: `${i * 0.15}s`,
                    }} />
                  ))}
                </div>
              )}

              {aiError && (
                <div style={{ background: "#FEF2F2", borderRadius: "14px", padding: "1rem 1.25rem", color: "#EF4444", fontSize: "0.88rem", borderLeft: "4px solid #EF4444" }}>
                  {aiError}
                </div>
              )}

              {!aiLoading && !aiError && aiInsights.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1.5rem" }}>
                  {aiInsights.map((ins, i) => (
                    <InsightCard key={i} insight={ins} index={i} />
                  ))}
                </div>
              )}

              {/* Weekly summary card */}
              <div style={{
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                borderRadius: "20px",
                padding: "1.5rem",
                color: "white",
                marginTop: "1.5rem",
              }}>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", marginBottom: "0.75rem" }}>
                  📅 Week at a Glance
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  {[
                    { label: "Best Day", value: "Saturday", sub: "2 happy sessions" },
                    { label: "Toughest Day", value: "Tuesday", sub: "3 stress events" },
                    { label: "Best Time", value: "Morning", sub: "Higher scores before noon" },
                  ].map((item) => (
                    <div key={item.label} style={{ background: "rgba(255,255,255,0.12)", borderRadius: "12px", padding: "10px 12px" }}>
                      <div style={{ fontSize: "0.7rem", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>{item.label}</div>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>{item.value}</div>
                      <div style={{ fontSize: "0.72rem", opacity: 0.7, marginTop: "1px" }}>{item.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── SESSION LOG TAB ── */}
          {tab === "log" && (
            <div style={{ animation: "fadeUp 0.4s ease" }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "#0F172A", marginBottom: "1.25rem" }}>
                Session Log
              </div>
              <div style={{ background: "white", borderRadius: "20px", overflow: "hidden", boxShadow: "0 2px 16px rgba(15,23,42,0.06)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 100px", padding: "10px 20px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  {["Day", "Mood", "Game", "Stars"].map((h) => (
                    <div key={h} style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
                  ))}
                </div>
                {[...MOCK_SESSIONS].reverse().map((s, i) => {
                  const m = MOOD_META[s.mood];
                  return (
                    <div
                      key={i}
                      className="log-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 1fr 1fr 100px",
                        padding: "12px 20px",
                        borderBottom: i < MOCK_SESSIONS.length - 1 ? "1px solid #F1F5F9" : "none",
                        alignItems: "center",
                        transition: "background 0.15s",
                        animation: "fadeUp 0.4s ease both",
                        animationDelay: `${i * 0.03}s`,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1E293B" }}>{s.date}</div>
                        <div style={{ fontSize: "0.72rem", color: "#94A3B8" }}>{s.time}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{
                          background: m.light, borderRadius: "20px",
                          padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: "4px",
                        }}>
                          <span style={{ fontSize: "0.85rem" }}>{m.emoji}</span>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: m.color }}>{m.label}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "#475569" }}>{s.game}</div>
                      <div style={{ fontSize: "0.85rem" }}>
                        {"⭐".repeat(s.stars)}
                        <span style={{ color: "#E2E8F0" }}>{"☆".repeat(3 - s.stars)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

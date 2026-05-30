import { NextResponse } from "next/server";

const WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const CLAUDE_MODEL = "claude-sonnet-4-6";

// ─── STEP 1: WHISPER ──────────────────────────────────────────────────────────

async function transcribeAudio(audioFile) {
  const form = new FormData();
  // Whisper requires a filename with an extension it recognises.
  const ext = audioFile.type?.includes("mp4") ? "mp4"
    : audioFile.type?.includes("ogg") ? "ogg"
    : "webm";
  form.append("file", audioFile, audioFile.name || `recording.${ext}`);
  form.append("model", "whisper-large-v3-turbo");
  form.append("language", "en");

  const res = await fetch(WHISPER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Groq Whisper ${res.status}: ${detail}`);
  }

  const data = await res.json();
  return (data.text ?? "").trim();
}

// ─── STEP 2: CLAUDE PROMPTS ───────────────────────────────────────────────────

// District-specific form blocks — kept close to the original tuned strings.
const DISTRICT_BLOCKS = {
  philly_sdp: `
You must generate TWO Philadelphia School District specific forms in addition to the standard fields.

FORM 1 — Behavior Referral (PowerSchool SDP):
"behavior_referral": {
  "alignment": "Discipline",
  "title": "5-word max incident title, no student names",
  "incident_time_frame_code": "MUST be exactly one of: Before School | During Class | Between Class | Lunch | After School | Off Campus",
  "context_description": "What class or activity was underway when the incident occurred",
  "location_description": "Specific location: classroom number, hallway, cafeteria, playground, gym, etc.",
  "details": "3–5 professional sentences, third person passive voice, no real names",
  "damages": "None — or describe property damage if mentioned"
}

FORM 2 — OSR-5 Statement (Philadelphia SDP serious incident paper form):
"osr5_statement": {
  "date": "<today's date>",
  "location": "Specific location where incident occurred",
  "narrative": "FIRST PERSON statement written as the teacher (I observed… I intervened…). Answer WHO, WHAT, WHEN, WHERE in sequence. 4–6 sentences. Student codes only, never real names.",
  "persons_involved": "Student codes only, e.g. Student A, Student B"
}`,

  delco: `
You must generate ONE Delaware County Schools incident report in addition to the standard fields.

FORM — Delaware County Incident Report:
"district_report": {
  "incident_type": "MUST be exactly one of: Physical Altercation | Verbal Altercation | Insubordination | Property Damage | Bullying | Other",
  "location": "Specific location in the building",
  "witnesses": "Student codes only, or 'None observed'",
  "parent_notified": "Yes | No | Attempted",
  "administrator_notified": "Yes | No",
  "details": "3–5 professional sentences, third person passive voice, no real names",
  "recommended_consequence": "Appropriate consequence or 'To be determined by administration'"
}`,

  pa_generic: `
You must generate ONE Pennsylvania standard incident report in addition to the standard fields.
This applies to PA districts outside Philadelphia (Montgomery County, Chester County, Bucks County, etc.)

FORM — Pennsylvania Incident Report:
"pa_report": {
  "incident_type": "MUST be exactly one of: Physical Altercation | Verbal Altercation | Insubordination | Property Damage | Bullying/Cyberbullying | Weapons | Substance | Other",
  "location": "Specific location in the building",
  "time_frame": "MUST be exactly one of: Before School | During Class | Between Class | Lunch | Recess | After School",
  "witnesses": "Student codes only, or 'None observed'",
  "parent_notified": "Yes | No",
  "administrator_notified": "Yes | No",
  "police_notified": "Yes | No — only Yes if explicitly mentioned",
  "details": "3–5 professional sentences, third person passive voice, no real names",
  "action_taken": "Specific immediate action taken by the teacher"
}`,

  nj_generic: `
You must generate ONE New Jersey incident report in addition to the standard fields.
New Jersey mandates HIB (Harassment, Intimidation, Bullying) classification on every incident report.

FORM — New Jersey Student Incident Report:
"nj_report": {
  "incident_classification": "MUST be exactly one of: HIB - Harassment Intimidation Bullying | Physical Altercation | Insubordination | Vandalism | Substance | Other",
  "location": "Specific location in the building",
  "time_of_day": "Approximate period, e.g. Morning, During 3rd period, Lunch, Afternoon",
  "witnesses": "Student codes only, or 'None observed'",
  "hib_determination": "REQUIRED BY NJ LAW — must be: Yes | No | Under Investigation. Choose 'Under Investigation' if unclear.",
  "parent_guardian_notified": "Yes | No",
  "law_enforcement_notified": "Yes | No — only Yes if explicitly mentioned",
  "details": "3–5 professional sentences, third person passive voice, no real names",
  "interventions_used": "De-escalation techniques or interventions used, or 'Standard redirection applied'"
}`,
};

function buildEducatorPrompt(districtId) {
  const districtBlock = DISTRICT_BLOCKS[districtId] ?? "";
  const hasDistrict = !!districtBlock;

  const districtSchemaAdditions = {
    philly_sdp: `  "behavior_referral": { ... },\n  "osr5_statement": { ... }`,
    delco: `  "district_report": { ... }`,
    pa_generic: `  "pa_report": { ... }`,
    nj_generic: `  "nj_report": { ... }`,
  };
  const extraFields = hasDistrict
    ? `,\n${districtSchemaAdditions[districtId]}`
    : "";

  return {
    system: `You are helping a K-12 teacher create professional, FERPA-compliant incident documentation.

CRITICAL — Name anonymisation rules:
- Replace ALL student full names (First Last) with sequential codes: Student A, Student B, Student C, etc.
- Replace first names that clearly refer to students with the same codes.
- Reduce staff references to role only: "the teacher", "the counsellor", "the principal".
- Never use real names anywhere in your output.

Category guidance:
- behavioral: incidents, disruptions, fights, defiance, threats, safety concerns
- academic: grades, assignments, missing work, IEP/504 concerns, tutoring
- parent_contact: any communication with parents or guardians
- intervention: support plans, counselling referrals, de-escalation used
- positive: achievements, recognised behaviour, commendations

${hasDistrict ? `DISTRICT FORMS REQUIRED (${districtId}):${districtBlock}` : "No district selected — generate standard fields only."}

Return ONLY valid JSON. No markdown fences, no explanation, no text outside the JSON.

Required structure:
{
  "summary": "One factual sentence, 25 words max, no real names",
  "description": "2–3 professional sentences, third person passive voice, no real names",
  "action_taken": "1–2 sentences describing what the teacher did",
  "follow_up": "1 sentence next steps, or 'No follow-up required'",
  "category": "behavioral | academic | parent_contact | intervention | positive"${extraFields}
}`,
    maxTokens: hasDistrict ? 1500 : 700,
  };
}

function buildTradePrompt() {
  return {
    system: `You are a professional field service report writer for plumbers and trade technicians.

Convert the technician's voice note into a structured JSON job report. Be concise, professional, and use standard trade terminology.

Category guidance:
- repair_job: active repair, fix, replacement, installation on-site
- estimate: quoting, pricing, scope of work presented to client
- maintenance: scheduled PM visit, inspection, flush, filter change, annual service
- parts_order: job paused waiting on parts; supply house order placed or needed

Client privacy rule: never include client full names; use "the client" or "the customer".

Return ONLY valid JSON. No markdown fences, no explanation, no text outside the JSON.

Required structure:
{
  "category": "repair_job | estimate | maintenance | parts_order",
  "summary": "One-sentence job summary, max 100 chars",
  "description": "2–3 sentence overview of the job situation and findings",
  "action_taken": "What was physically done on-site",
  "follow_up": "Next steps, return visit, or parts to order",
  "client_issue": "The problem the client reported",
  "diagnostic_findings": "What the technician found upon inspection",
  "materials_used": "Parts and materials used, quantities if mentioned; 'None' if estimate only",
  "recommended_next_steps": "Follow-up work, parts to order, or scheduled return"
}`,
    maxTokens: 700,
  };
}

// ─── STEP 2: CLAUDE CALL ──────────────────────────────────────────────────────

async function formatWithClaude(transcript, appMode, districtId) {
  const { system, maxTokens } =
    appMode === "trade"
      ? buildTradePrompt()
      : buildEducatorPrompt(districtId);

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: `Transcript: "${transcript}"\n\nGenerate the JSON report now.` }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Anthropic ${res.status}: ${detail}`);
  }

  const data = await res.json();
  const raw = data.content?.[0]?.text ?? "";

  // Strip optional markdown fences Claude occasionally emits.
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  return JSON.parse(jsonStr);
}

// ─── ROUTE HANDLER ────────────────────────────────────────────────────────────

export async function POST(request) {
  // ── Config guards ──────────────────────────────────────────────────────────
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Server misconfiguration: GROQ_API_KEY is not set." },
      { status: 500 }
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server misconfiguration: ANTHROPIC_API_KEY is not set." },
      { status: 500 }
    );
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must be multipart/form-data." },
      { status: 400 }
    );
  }

  const audioFile = formData.get("audio");
  const appMode   = formData.get("appMode")   || "educator";
  const districtId = formData.get("districtId") || "none";

  if (!audioFile || typeof audioFile === "string") {
    return NextResponse.json(
      { error: "Missing 'audio' file in form data." },
      { status: 400 }
    );
  }

  // Warmup ping — tiny blob sent at app startup to reduce cold-start latency.
  if (audioFile.size < 100) {
    return NextResponse.json({ status: "warm" });
  }

  // ── Step 1: Transcribe via Whisper ─────────────────────────────────────────
  let transcript;
  try {
    transcript = await transcribeAudio(audioFile);
  } catch (err) {
    console.error("[format-report] Groq Whisper error:", err.message);
    return NextResponse.json(
      { error: `Transcription failed: ${err.message}` },
      { status: 502 }
    );
  }

  if (!transcript) {
    return NextResponse.json(
      { error: "No speech detected in the recording. Please try again." },
      { status: 422 }
    );
  }

  // ── Step 2: Format via Claude ──────────────────────────────────────────────
  let report;
  try {
    report = await formatWithClaude(transcript, appMode, districtId);
  } catch (err) {
    console.error("[format-report] Claude error:", err.message);
    // Return the raw transcript so the client can still display something.
    const fallback = appMode === "trade"
      ? {
          category: "repair_job",
          summary: transcript.slice(0, 100),
          description: transcript,
          action_taken: "Documented via voice log.",
          follow_up: "Review as needed.",
          client_issue: transcript,
          diagnostic_findings: "",
          materials_used: "",
          recommended_next_steps: "",
        }
      : {
          category: "behavioral",
          summary: transcript.slice(0, 80),
          description: transcript,
          action_taken: "Teacher responded and documented the incident.",
          follow_up: "Review as needed.",
        };

    return NextResponse.json(
      { transcript, aiError: true, ...fallback },
      { status: 207 } // 207 Multi-Status: partial success
    );
  }

  return NextResponse.json({ transcript, appMode, districtId, ...report });
}

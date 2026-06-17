// ─── VEHICLE LOG VOICE API ─────────────────────────────────────────────────────
// Accepts audio blob → Groq Whisper transcription → Claude structured extraction.
// Returns a JSON draft with type-specific fields pre-filled for the form.

export async function POST(req) {
  let formData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!audio) {
    return Response.json({ error: "No audio file" }, { status: 400 });
  }

  // ── Step 1: Whisper transcription via Groq ────────────────────────────────
  let transcript = "";
  try {
    const whisperForm = new FormData();
    whisperForm.append("file", audio, "recording.webm");
    whisperForm.append("model", "whisper-large-v3");

    const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: whisperForm,
    });

    if (!whisperRes.ok) throw new Error("Whisper failed");
    const whisperData = await whisperRes.json();
    transcript = whisperData.text ?? "";
  } catch {
    return Response.json({ error: "Transcription failed" }, { status: 500 });
  }

  if (!transcript.trim()) {
    return Response.json({ error: "No speech detected" }, { status: 400 });
  }

  // ── Step 2: Claude structured extraction ──────────────────────────────────
  const prompt = `You are a vehicle log assistant for a field service tradesman. Extract structured data from this voice note.

Voice transcript:
"${transcript}"

Determine the log type (mileage, fuel, or maintenance) from the content, then extract all relevant fields.

Respond ONLY with a JSON object — no preamble, no markdown, no explanation:
{
  "type": "mileage" | "fuel" | "maintenance",
  "vehicle": "vehicle name or null",
  "date": "YYYY-MM-DD or null",
  "purpose": "trip purpose or null (mileage only)",
  "odometer_start": "number as string or null (mileage only)",
  "odometer_end": "number as string or null (mileage only)",
  "gallons": "number as string or null (fuel only)",
  "fuel_cost": "number as string or null (fuel only)",
  "station": "station name or null (fuel only)",
  "work_done": "description of work or null (maintenance only)",
  "parts_cost": "number as string or null (maintenance only)",
  "labor_cost": "number as string or null (maintenance only)",
  "shop_name": "shop name or null (maintenance only)",
  "notes": "any other notes or null"
}

Rules:
- type must be one of: mileage, fuel, maintenance. Infer from context.
- All number strings should be plain decimals (e.g. "18.4", "72.50").
- If date is not mentioned, use null — do not guess.
- Omit no fields — use null for anything not mentioned.`;

  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) throw new Error("Claude failed");
    const aiData = await aiRes.json();
    const raw = aiData.content?.[0]?.text ?? "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return Response.json({ ...parsed, transcript });
  } catch {
    // Return transcript only so the form can be filled manually.
    return Response.json({ transcript, aiError: true });
  }
}

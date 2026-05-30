export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { transcript, categoryLabel, studentCode, dateStr, timeStr, districtId, districtPrompt } = req.body || {};

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required" });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("format-report: missing ANTHROPIC_API_KEY");
      return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });
    }

    // Build district-specific instructions
    const districtInstructions = {
      philly_sdp: `
You must generate TWO Philadelphia School District specific forms in addition to the standard report.

FORM 1 — Behavior Referral (used in PowerSchool by Philadelphia SDP teachers):
"behavior_referral": {
  "alignment": "Discipline",
  "title": "5-word max incident title, no student names",
  "incident_time_frame_code": "MUST be one of exactly: Before School | During Class | Between Class | Lunch | After School | Off Campus",
  "context_description": "What class or activity was taking place when incident occurred",
  "location_description": "Specific location: classroom number, hallway, cafeteria, playground, gym, etc.",
  "details": "3-5 sentence detailed description written in third person, passive voice, professional tone. No real names.",
  "damages": "None — or describe any property damage if mentioned"
}

FORM 2 — OSR-5 Statement (Philadelphia SDP paper form for serious incidents):
"osr5_statement": {
  "date": "${dateStr || new Date().toLocaleDateString()}",
  "location": "Specific location where incident occurred",
  "narrative": "FIRST PERSON statement written as the teacher (I observed... I intervened...). Must answer: WHO was involved, WHAT happened in sequence, WHEN it occurred, WHERE it took place. 4-6 sentences. Use student codes only, never real names.",
  "persons_involved": "List using student codes only (e.g. Student A, Student B)"
}`,

      delco: `
You must generate ONE Delaware County Schools incident report in addition to the standard report.

FORM — Delaware County Incident Report:
"district_report": {
  "incident_type": "MUST be one of exactly: Physical Altercation | Verbal Altercation | Insubordination | Property Damage | Bullying | Other",
  "location": "Specific location in the building",
  "witnesses": "List any witnesses using student codes only, or 'None observed'",
  "parent_notified": "Yes or No — infer from transcript if mentioned, otherwise 'No'",
  "administrator_notified": "Yes or No — infer from transcript if mentioned, otherwise 'No'",
  "details": "3-5 professional sentences describing the incident. No real names. Third person passive voice.",
  "recommended_consequence": "Suggest an appropriate consequence based on incident type, or 'To be determined by administration'"
}`,

      pa_generic: `
You must generate ONE Pennsylvania standard incident report in addition to the standard report.
This is for Pennsylvania districts OUTSIDE Philadelphia (e.g. Montgomery County, Chester County, Bucks County, etc.)

FORM — Pennsylvania Incident Report:
"pa_report": {
  "incident_type": "MUST be one of exactly: Physical Altercation | Verbal Altercation | Insubordination | Property Damage | Bullying/Cyberbullying | Weapons | Substance | Other",
  "location": "Specific location in the building",
  "time_frame": "MUST be one of exactly: Before School | During Class | Between Class | Lunch | Recess | After School",
  "witnesses": "Student codes only, or 'None observed'",
  "parent_notified": "Yes or No",
  "administrator_notified": "Yes or No",
  "police_notified": "Yes or No — only Yes if explicitly mentioned",
  "details": "3-5 professional sentences. No real names. Third person passive voice.",
  "action_taken": "Specific immediate action taken by the teacher"
}`,

      nj_generic: `
You must generate ONE New Jersey incident report in addition to the standard report.
New Jersey has specific HIB (Harassment, Intimidation, Bullying) laws — this field is legally required.

FORM — New Jersey Student Incident Report:
"nj_report": {
  "incident_classification": "MUST be one of exactly: HIB - Harassment Intimidation Bullying | Physical Altercation | Insubordination | Vandalism | Substance | Other",
  "location": "Specific location in the building",
  "time_of_day": "Approximate time period (e.g. Morning, Before school, During 3rd period, Lunch, Afternoon)",
  "witnesses": "Student codes only, or 'None observed'",
  "hib_determination": "REQUIRED BY NJ LAW — must be: Yes | No | Under Investigation. Choose 'Under Investigation' if unclear from the transcript.",
  "parent_guardian_notified": "Yes or No",
  "law_enforcement_notified": "Yes or No — only Yes if explicitly mentioned",
  "details": "3-5 professional sentences. No real names. Third person passive voice.",
  "interventions_used": "Describe any de-escalation techniques or interventions attempted by the teacher, or 'Standard redirection applied'"
}`
    };

    const selectedDistrict = districtInstructions[districtId] || "";
    const hasDistrict = !!selectedDistrict;

    const prompt = `You are helping a K-12 teacher create professional incident documentation.

CRITICAL FERPA RULE: Replace ALL student names with the student code "${studentCode || "Student A"}". Never use real names anywhere in your output under any circumstances.

Category: ${categoryLabel || "Behavioral"}
Student Code: ${studentCode || "Student A"}
Date: ${dateStr || "Today"} at ${timeStr || ""}
District: ${districtId || "none"}
Teacher's voice note: "${transcript}"

${hasDistrict ? `DISTRICT FORMS REQUIRED: This teacher uses ${districtId} forms. You MUST generate both the standard fields AND the district-specific fields below.
${selectedDistrict}` : "Generate standard fields only — no district forms selected."}

Return ONLY a single valid JSON object. No markdown fences, no explanation, no text outside the JSON.

Required JSON structure:
{
  "summary": "One sentence, 25 words max, factual, no real names",
  "description": "2-3 professional sentences, passive voice, no real names",
  "action_taken": "1-2 sentences describing what the teacher did",
  "follow_up": "1 sentence next steps, or 'No follow-up required'"${hasDistrict ? "," : ""}
  ${hasDistrict && districtId === "philly_sdp" ? '"behavior_referral": { ... as specified above },' : ""}
  ${hasDistrict && districtId === "philly_sdp" ? '"osr5_statement": { ... as specified above }' : ""}
  ${hasDistrict && districtId === "delco" ? '"district_report": { ... as specified above }' : ""}
  ${hasDistrict && districtId === "pa_generic" ? '"pa_report": { ... as specified above }' : ""}
  ${hasDistrict && districtId === "nj_generic" ? '"nj_report": { ... as specified above }' : ""}
}`;

    console.log("format-report: calling Anthropic, category:", categoryLabel, "district:", districtId || "none");

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: hasDistrict ? 1500 : 600,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!anthropicRes.ok) {
      const errorText = await anthropicRes.text();
      console.error("format-report: Anthropic API error:", errorText);
      return res.status(200).json({
        summary: "Incident documented via voice log.",
        description: transcript,
        action_taken: "Teacher responded and documented the incident.",
        follow_up: "Review as needed."
      });
    }

    const data = await anthropicRes.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(clean);
      console.log("format-report: success, district:", districtId || "none");
      return res.status(200).json({
        summary:           parsed.summary           || "Incident documented via voice log.",
        description:       parsed.description       || transcript,
        action_taken:      parsed.action_taken      || "Teacher responded and documented the incident.",
        follow_up:         parsed.follow_up         || "Review as needed.",
        behavior_referral: parsed.behavior_referral || null,
        osr5_statement:    parsed.osr5_statement    || null,
        district_report:   parsed.district_report   || null,
        nj_report:         parsed.nj_report         || null,
        pa_report:         parsed.pa_report         || null,
      });
    } catch (parseError) {
      console.error("format-report: JSON parse failed:", parseError.message, "raw:", clean.slice(0, 200));
      return res.status(200).json({
        summary: "Incident documented via voice log.",
        description: transcript,
        action_taken: "Teacher responded and documented the incident.",
        follow_up: "Review as needed."
      });
    }
  } catch (error) {
    console.error("format-report: unhandled error:", error.message);
    return res.status(500).json({ error: "Failed to format report" });
  }
}

// ─── WAITLIST CAPTURE ─────────────────────────────────────────────────────────
// Captures upgrade-intent emails from the in-app upgrade sheet.
//
// If WAITLIST_WEBHOOK_URL is set (Zapier, Make, Formspree, Google Apps
// Script, etc.), the signup is forwarded there as JSON. Either way the
// signup is logged so it appears in Vercel function logs as a backstop.

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email   = (body?.email ?? "").trim();
  const appMode = body?.appMode ?? "unknown";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Please enter a valid email" }, { status: 400 });
  }

  const payload = {
    email,
    appMode,
    source: "logit-upgrade-sheet",
    ts: new Date().toISOString(),
  };

  // Backstop: always visible in Vercel logs even with no webhook configured.
  console.log("[waitlist]", JSON.stringify(payload));

  const hook = process.env.WAITLIST_WEBHOOK_URL;
  if (hook) {
    try {
      await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Webhook failure shouldn't fail the signup — it's already logged.
    }
  }

  return Response.json({ ok: true });
}

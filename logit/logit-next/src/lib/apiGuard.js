// ─── API GUARD ────────────────────────────────────────────────────────────────
// Shared request guard for /api/format-report and /api/vehicle-log:
// per-IP rate limiting, audio size limit, and (in production) an Origin check.

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20MB

// NOTE: this Map lives in the serverless function's memory, so the limit is
// per-instance, not global — a client can get a fresh bucket on cold start
// or by landing on a different instance. Fine for now; replace with a
// shared store (e.g. Upstash Ratelimit) before this needs to hold at scale.
const requestLog = new Map(); // ip -> array of request timestamps (ms)

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(ip, recent);
    return true;
  }

  recent.push(now);
  requestLog.set(ip, recent);
  return false;
}

/**
 * Runs shared request checks for the audio API routes.
 * Call after parsing formData (so `audioFile` is available) but before any
 * Groq/Anthropic calls. Returns a Response to short-circuit the route with,
 * or null if the request is allowed to proceed.
 */
export function apiGuard(request, audioFile) {
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    return Response.json(
      { error: "Too many requests. Try again in a few minutes." },
      { status: 429 }
    );
  }

  if (audioFile && typeof audioFile !== "string" && audioFile.size > MAX_AUDIO_BYTES) {
    return Response.json(
      { error: "Audio file is too large. Recordings must be under 20MB." },
      { status: 413 }
    );
  }

  if (process.env.NODE_ENV === "production") {
    const origin = request.headers.get("origin");
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;
    if (origin && allowedOrigin && origin !== allowedOrigin) {
      return Response.json({ error: "Origin not allowed." }, { status: 403 });
    }
  }

  return null;
}

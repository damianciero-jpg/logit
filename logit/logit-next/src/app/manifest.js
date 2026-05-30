// Next.js serves this as /manifest.json — evaluated at build time.
// process.env.NEXT_PUBLIC_APP_MODE is substituted by the Next.js compiler.

const MODE = process.env.NEXT_PUBLIC_APP_MODE || "educator";

const MODES = {
  educator: {
    name: "LogIt — Teacher Incident Log",
    short_name: "LogIt",
    description:
      "FERPA-aware voice-to-report for K-12 educators. Speak for 30 seconds, get a professional incident report.",
    theme_color: "#E63946",
    background_color: "#F8FAFF",
    categories: ["education", "productivity"],
    shortcuts: [
      {
        name: "Record Incident",
        short_name: "Record",
        url: "/?tab=record",
        description: "Start a new voice incident log",
      },
    ],
  },
  trade: {
    name: "ServiceLog — Field Service Job Log",
    short_name: "ServiceLog",
    description:
      "Hands-free job logging for plumbers and field service technicians. Speak the job, get a structured report.",
    theme_color: "#F4811F",
    background_color: "#0A0A0F",
    categories: ["business", "productivity"],
    shortcuts: [
      {
        name: "Log a Job",
        short_name: "Log Job",
        url: "/?tab=record",
        description: "Start a new field service job log",
      },
    ],
  },
};

const cfg = MODES[MODE] ?? MODES.educator;

export default function manifest() {
  return {
    name: cfg.name,
    short_name: cfg.short_name,
    description: cfg.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: cfg.background_color,
    theme_color: cfg.theme_color,
    categories: cfg.categories,
    shortcuts: cfg.shortcuts,
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

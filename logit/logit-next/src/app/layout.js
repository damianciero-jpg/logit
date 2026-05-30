import { Geist, Geist_Mono } from "next/font/google";
import appConfig from "@/config/appConfig";
import PWAProvider from "@/components/PWAProvider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const MODE = process.env.NEXT_PUBLIC_APP_MODE || "educator";

// ── Page metadata ────────────────────────────────────────────────────────────
export const metadata = {
  title:       `${appConfig.appTitle} — ${appConfig.appSubtitle}`,
  description: appConfig.appDescription,
  manifest:    "/manifest.json",

  // iOS PWA — enables "Add to Home Screen" standalone mode
  appleWebApp: {
    capable:         true,
    title:           appConfig.appTitle,
    statusBarStyle:  MODE === "trade" ? "black-translucent" : "default",
  },

  // Prevent iOS from auto-linking phone numbers in the UI
  formatDetection: { telephone: false },
};

// ── Viewport / theme colour ──────────────────────────────────────────────────
// Exported separately so Next.js sets <meta name="theme-color"> correctly.
export const viewport = {
  themeColor:    appConfig.colors.primary,
  width:         "device-width",
  initialScale:  1,
  maximumScale:  1,
  userScalable:  false,
};

// ── Root layout ──────────────────────────────────────────────────────────────
export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Registers /sw.js and handles silent background updates */}
        <PWAProvider />
        {children}
      </body>
    </html>
  );
}

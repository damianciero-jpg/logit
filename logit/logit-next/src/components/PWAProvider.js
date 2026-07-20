"use client";

import { useEffect } from "react";

// Registers /sw.js and wires up automatic silent updates.
// Rendered as a null component inside RootLayout.
export default function PWAProvider() {
  useEffect(() => {
    // Ask the browser to persist storage so iOS is less likely to evict
    // IndexedDB (photos) and localStorage (logs) under storage pressure.
    try {
      navigator.storage?.persist?.();
    } catch {
      // Non-fatal — persistence is a best-effort hint, not a requirement.
    }

    if (!("serviceWorker" in navigator)) return;

    let registration;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        registration = reg;

        // When a new SW version is found, install it immediately rather than
        // waiting for the user to close all tabs.
        reg.addEventListener("updatefound", () => {
          const incoming = reg.installing;
          if (!incoming) return;

          incoming.addEventListener("statechange", () => {
            if (
              incoming.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              incoming.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch(() => {
        // SW registration failure is non-fatal — app works normally online.
      });

    // When the controlling SW changes (after SKIP_WAITING), reload the page
    // once so all clients run the same version.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    return () => {
      // No cleanup needed; the SW lifecycle is managed by the browser.
    };
  }, []);

  return null;
}

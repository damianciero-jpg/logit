// @ts-check
/**
 * Error-handling tests for Logit / ServiceLog.
 *
 * Media hardware: playwright.config.js adds --use-fake-ui-for-media-stream and
 * --use-fake-device-for-media-stream so the real MediaRecorder runs against a
 * browser-level sine-wave microphone — no real hardware needed.
 *
 * API calls are intercepted with page.route() so no real Groq / Anthropic
 * requests are made.
 *
 * Local dev runs in trade mode (NEXT_PUBLIC_APP_MODE=trade in .env.local),
 * so the Record tab is labelled "Log Job" and the Truck tab is present.
 */

const { test, expect } = require("@playwright/test");

// ─── Permission-denied injection ─────────────────────────────────────────────
// Overrides getUserMedia to throw NotAllowedError, bypassing the fake-device
// browser flags set globally. Sets an OWN property on the MediaDevices instance
// so it shadows the prototype method regardless of the browser's flag config.
const DENIED_MIC = `
navigator.mediaDevices.getUserMedia = async function() {
  throw new DOMException('Permission denied by user', 'NotAllowedError');
};
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Navigate to the app and wait for React to hydrate.
 * networkidle gives the JS time to hydrate and attach event handlers.
 */
async function goHome(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

/** Click the tab bar button with the given label text. */
async function clickTab(page, label) {
  await page.locator("button").filter({ hasText: label }).first().click();
}

/**
 * Start recording on the idle RecordingScreen.
 * Waits for the active recording overlay to appear (confirms isRecording=true).
 */
async function startJobRecording(page) {
  await page.click('[aria-label="Start recording"]');
  await page.waitForSelector('[aria-label="Stop recording"]', { timeout: 5000 });
}

/** Wait at least one MediaRecorder timeslice (250ms) so a data chunk fires. */
async function waitForChunk(page) {
  await page.waitForTimeout(350);
}

/** Stop the current full-screen recording overlay. */
async function stopJobRecording(page) {
  await page.click('[aria-label="Stop recording"]');
}

/** Wait for a toast notification containing the given substring. */
async function expectToast(page, substring, timeout = 7000) {
  await expect(page.locator(`text=${substring}`).last()).toBeVisible({ timeout });
}

// ─── Test 1: Empty/silent recording → clear error toast ──────────────────────

test.describe("1 · Empty/silent recording shows clear error", () => {
  test("job log (Log Job tab): API returns no-speech error → toast, no crash", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.route("/api/format-report", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "No speech detected" }),
      })
    );

    await goHome(page);
    await clickTab(page, "Log Job");
    // Wait for idle RecordingScreen to mount after tab switch
    await page.waitForSelector('[aria-label="Start recording"]', { timeout: 5000 });

    await startJobRecording(page);
    await waitForChunk(page);
    await stopJobRecording(page);

    await expectToast(page, "Processing failed");

    // App must return to interactive state — tab bar reappears
    await expect(page.locator("button").filter({ hasText: "Log Job" })).toBeVisible({
      timeout: 5000,
    });
    expect(pageErrors).toHaveLength(0);
  });

  test("vehicle log (Truck tab): API returns no-speech error → toast, no crash", async ({
    page,
  }) => {
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.route("/api/vehicle-log", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "No speech detected" }),
      })
    );

    await goHome(page);
    await clickTab(page, "Truck");
    await page.waitForSelector("text=Tap to speak your vehicle log", { timeout: 5000 });

    // Tap MicTrigger → handleStartVehicleRecording → global RecordingScreen overlay appears
    await page.locator("text=Tap to speak your vehicle log").click();
    await page.waitForSelector('[aria-label="Stop recording"]', { timeout: 5000 });
    await waitForChunk(page);
    // Click the global overlay to stop (same overlay used by job recording)
    await page.click('[aria-label="Stop recording"]');

    await expectToast(page, "Couldn't auto-fill");
    await expect(page.locator("button").filter({ hasText: "Save Vehicle Log" })).toBeVisible({
      timeout: 5000,
    });
    expect(pageErrors).toHaveLength(0);
  });
});

// ─── Test 2: Network failure → error toast + app recovers ────────────────────

test.describe("2 · Network failure during processing", () => {
  test("job log: aborted network request → error toast + idle state", async ({ page }) => {
    await page.route("/api/format-report", (route) => route.abort("failed"));

    await goHome(page);
    await clickTab(page, "Log Job");
    await page.waitForSelector('[aria-label="Start recording"]', { timeout: 5000 });

    await startJobRecording(page);
    await waitForChunk(page);
    await stopJobRecording(page);

    await expectToast(page, "Network error");

    // App must return to idle — not stuck on spinner
    await expect(page.locator('[aria-label="Start recording"]')).toBeVisible({ timeout: 6000 });
  });

  test("vehicle log: aborted network request → error toast + form interactive", async ({
    page,
  }) => {
    await page.route("/api/vehicle-log", (route) => route.abort("failed"));

    await goHome(page);
    await clickTab(page, "Truck");
    await page.waitForSelector("text=Tap to speak your vehicle log", { timeout: 5000 });

    await page.locator("text=Tap to speak your vehicle log").click();
    await page.waitForSelector('[aria-label="Stop recording"]', { timeout: 5000 });
    await waitForChunk(page);
    await page.click('[aria-label="Stop recording"]');

    await expectToast(page, "Network error");
    await expect(page.locator("button").filter({ hasText: "Save Vehicle Log" })).toBeVisible({
      timeout: 6000,
    });
  });
});

// ─── Test 3: Microphone permission denied → specific error message ────────────

test.describe("3 · Microphone permission denied", () => {
  test("job log: NotAllowedError → 'Microphone access was denied' banner", async ({ page }) => {
    // Override getUserMedia at the page level to simulate permission denial.
    // This runs before any page script and overrides the fake-device auto-grant.
    await page.addInitScript({ content: DENIED_MIC });

    await goHome(page);
    await clickTab(page, "Log Job");
    await page.waitForSelector('[aria-label="Start recording"]', { timeout: 5000 });

    // Tapping the mic triggers startRecording → getUserMedia → NotAllowedError
    await page.click('[aria-label="Start recording"]');

    // The hook sets recorder.error which renders in a red banner (page.js line 391)
    await expect(page.locator("text=Microphone access was denied")).toBeVisible({
      timeout: 5000,
    });
    // No generic "undefined" or crash fallback
    await expect(page.locator("text=undefined")).not.toBeVisible();
  });

  test("vehicle log: NotAllowedError → same 'Microphone access was denied' banner", async ({
    page,
  }) => {
    await page.addInitScript({ content: DENIED_MIC });

    await goHome(page);
    await clickTab(page, "Truck");
    await page.waitForSelector("text=Tap to speak your vehicle log", { timeout: 5000 });

    await page.locator("text=Tap to speak your vehicle log").click();

    await expect(page.locator("text=Microphone access was denied")).toBeVisible({
      timeout: 5000,
    });
  });
});

// ─── Test 4: Malformed AI response handled gracefully ────────────────────────

test.describe("4 · Malformed AI response is handled gracefully", () => {
  test("job log: 500 error → fallback toast, returns to idle (no spinner)", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.route("/api/format-report", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      })
    );

    await goHome(page);
    await clickTab(page, "Log Job");
    await page.waitForSelector('[aria-label="Start recording"]', { timeout: 5000 });
    await startJobRecording(page);
    await waitForChunk(page);
    await stopJobRecording(page);

    await expectToast(page, "Processing failed");
    // Processing spinner must clear — not stuck
    await expect(page.locator('[aria-label="Start recording"]')).toBeVisible({ timeout: 6000 });
    expect(pageErrors).toHaveLength(0);
  });

  test("job log: aiError=true response → shows AI fallback banner in result", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.route("/api/format-report", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          aiError: true,
          transcript: "Test job log",
          summary: "Test summary",
          description: "Test description",
          action_taken: "Test action",
          follow_up: "",
          category: "other",
        }),
      })
    );

    await goHome(page);
    await clickTab(page, "Log Job");
    await page.waitForSelector('[aria-label="Start recording"]', { timeout: 5000 });
    await startJobRecording(page);
    await waitForChunk(page);
    await stopJobRecording(page);

    // aiError=true but summary present → goes to ResultScreen with aiError banner
    await expect(page.locator("text=AI used fallback formatting")).toBeVisible({ timeout: 7000 });
    await expect(page.locator("text=undefined")).not.toBeVisible();
    expect(pageErrors).toHaveLength(0);
  });

  test("vehicle log: 500 error → toast, form stays interactive", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.route("/api/vehicle-log", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      })
    );

    await goHome(page);
    await clickTab(page, "Truck");
    await page.waitForSelector("text=Tap to speak your vehicle log", { timeout: 5000 });
    await page.locator("text=Tap to speak your vehicle log").click();
    await page.waitForSelector('[aria-label="Stop recording"]', { timeout: 5000 });
    await waitForChunk(page);
    await page.click('[aria-label="Stop recording"]');

    await expectToast(page, "Couldn't auto-fill");
    await expect(page.locator("button").filter({ hasText: "Save Vehicle Log" })).toBeVisible({
      timeout: 6000,
    });
    expect(pageErrors).toHaveLength(0);
  });

  test("vehicle log: aiError=true response → pre-fill banner shown, no undefined text", async ({
    page,
  }) => {
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    // aiError=true without an `error` key → no toast; setVehicleAiDraft(data) is called
    // but the draft has no structured fields, so form fields stay empty.
    await page.route("/api/vehicle-log", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ transcript: "Test vehicle log", aiError: true }),
      })
    );

    await goHome(page);
    await clickTab(page, "Truck");
    await page.waitForSelector("text=Tap to speak your vehicle log", { timeout: 5000 });
    await page.locator("text=Tap to speak your vehicle log").click();
    await page.waitForSelector('[aria-label="Stop recording"]', { timeout: 5000 });
    await waitForChunk(page);
    await page.click('[aria-label="Stop recording"]');

    // aiDraft is set (no error key), so the "pre-filled" banner appears
    await expect(
      page.locator("text=Fields pre-filled from your recording")
    ).toBeVisible({ timeout: 7000 });
    await expect(page.locator("text=undefined")).not.toBeVisible();
    expect(pageErrors).toHaveLength(0);
  });
});

// ─── Test 5: Saved logs with null fields render without errors ────────────────

test.describe("5 · Saved logs with null/missing fields render without errors", () => {
  test("jobs tab: log with all optional fields null renders without 'undefined'", async ({
    page,
  }) => {
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.addInitScript(() => {
      const log = {
        id: "test-null-fields",
        category: "other",
        summary: null,
        description: null,
        action_taken: null,
        follow_up: null,
        job_ref: null,
        client_issue: null,
        diagnostic_findings: null,
        materials_used: null,
        recommended_next_steps: null,
        behavior_referral: null,
        osr5_statement: null,
        district_report: null,
        nj_report: null,
        pa_report: null,
        districtId: "none",
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("logit_logs", JSON.stringify([log]));
    });

    await goHome(page);
    await clickTab(page, "Jobs");
    await page.waitForTimeout(400); // allow React to render the list

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain("undefined");
    expect(pageErrors).toHaveLength(0);
  });

  test("vehicle history: log with all optional fields null renders without 'undefined'", async ({
    page,
  }) => {
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.addInitScript(() => {
      const log = {
        id: "test-vehicle-null",
        type: "mileage",
        vehicle: "Test Truck",
        date: "2026-06-17",
        createdAt: new Date().toISOString(),
        odometer_start: null,
        odometer_end: null,
        miles: null,
        purpose: null,
        gallons: null,
        fuel_cost: null,
        station: null,
        work_done: null,
        parts_cost: null,
        labor_cost: null,
        shop_name: null,
        notes: null,
      };
      localStorage.setItem("logit_vehicle_logs", JSON.stringify([log]));
    });

    await goHome(page);
    await clickTab(page, "Truck");
    await page.waitForSelector("text=Tap to speak your vehicle log", { timeout: 5000 });

    await page.locator("button").filter({ hasText: /History/ }).click();
    await expect(page.locator("text=Test Truck")).toBeVisible({ timeout: 3000 });

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain("undefined");
    expect(pageErrors).toHaveLength(0);
  });
});

// @ts-check
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 6_000 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    // Auto-grant microphone without a permissions dialog.
    permissions: ["microphone"],
    launchOptions: {
      args: [
        // Provide a fake microphone device (sine-wave audio) so getUserMedia
        // works in headless without real hardware, and auto-grant the permission
        // so no dialog appears.
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

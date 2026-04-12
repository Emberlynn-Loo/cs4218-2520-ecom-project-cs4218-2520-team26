#!/usr/bin/env node

/**
 * Smoke Test Runner
 * Reads configuration from smoke-config.js and executes JMeter test + reporting.
 * Created by Nicholas Koh Zi Lun, A0272806B
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const config = require("./smoke-config.js");

const resultsDir = path.join(__dirname, "results");
const jtlFile = path.join(resultsDir, "auth-spike-smoke.jtl");
const reportDir = path.join(resultsDir, "auth-spike-smoke-report");
const jmxFile = path.join(__dirname, "jmeter", "auth-spike-test.jmx");

console.log("🔧 Smoke Test Configuration:");
console.log(`   Profile: ${config.name || "smoke"}`);
console.log(
  `   Target: ${config.protocol || "http"}://${config.host || "localhost"}:${config.port || 6060}`,
);
console.log(
  `   Baseline: ${config.baselineUsers} users for ${config.baselineDurationSec}s (ramp ${config.baselineRampSeconds}s)`,
);
console.log(
  `   Spike: ${config.baselineUsers} → ${config.spikePeakUsers} users over ${config.spikeTriggerDurationSec}s, held for ${config.spikeHoldDurationSec}s`,
);
console.log(
  `   Login latency threshold: ${config.loginLatencyThresholdMs}ms`,
);
console.log(
  `   Recovery: ramp ${config.recoveryRampSec}s over ${config.recoveryDurationSec}s, Post-spike: ${config.postSpikeDurationSec}s`,
);
console.log();

// Clean up old results
console.log("🧹 Cleaning up old results...");
fs.mkdirSync(resultsDir, { recursive: true });
try {
  fs.rmSync(jtlFile, { force: true });
  fs.rmSync(reportDir, { recursive: true, force: true });
} catch (e) {
  // Ignore cleanup errors
}

// Run JMeter test
console.log("▶️  Running JMeter test...");
const jmeterLogFile = path.join(resultsDir, "jmeter.log");

const jmeterCmd = [
  "jmeter -n -t",
  jmxFile,
  `-j "${jmeterLogFile}"`,
  `-JPROTOCOL=${config.protocol || "http"}`,
  `-JHOST=${config.host || "localhost"}`,
  `-JPORT=${config.port || 6060}`,
  `-JBASELINE_USERS=${config.baselineUsers}`,
  `-JBASELINE_RAMP_SECONDS=${config.baselineRampSeconds}`,
  `-JSPIKE_PEAK_USERS=${config.spikePeakUsers}`,
  `-JBASELINE_SEC=${config.baselineDurationSec}`,
  `-JSPIKE_TRIGGER_SEC=${config.spikeTriggerDurationSec}`,
  `-JSPIKE_HOLD_SEC=${config.spikeHoldDurationSec}`,
  `-JRECOVERY_RAMP_SEC=${config.recoveryRampSec}`,
  `-JRECOVERY_SEC=${config.recoveryDurationSec}`,
  `-JPOST_SPIKE_SEC=${config.postSpikeDurationSec}`,
  `-JLOGIN_LATENCY_THRESHOLD_MS=${config.loginLatencyThresholdMs || 5000}`,
  `-JCREDENTIALS_CSV=${config.credentialsCsv || "tests/performance/jmeter/auth-users.csv"}`,
  `-JDEFAULT_EMAIL=${config.defaultEmail || "spike-user-01@team26.local"}`,
  `-JDEFAULT_PASSWORD=${config.defaultPassword || "SpikePass@1"}`,
  `-l "${jtlFile}"`,
].join(" ");

try {
  execSync(jmeterCmd, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
} catch (e) {
  console.error("❌ JMeter test failed");
  console.error(`   Check JMeter log: ${jmeterLogFile}`);
  process.exit(1);
}

// Generate report
console.log("\n📊 Generating JMeter HTML report...");
const reportCmd = `jmeter -g "${jtlFile}" -o "${reportDir}"`;
try {
  execSync(reportCmd, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
} catch (e) {
  console.error(
    "⚠️  Report generation had issues (test data may still be usable)",
  );
}

// Generate phase summary
console.log("\n📈 Generating phase summary...");
try {
  execSync("node tests/non-functional/spike/auth-spike-testing/generate_phase_summary.cjs", {
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd: path.join(__dirname, "..", "..", "..", ".."),
    env: {
      ...process.env,
      JTL_PATH: jtlFile,
      OUT_DIR: resultsDir,
      BASELINE_USERS: String(config.baselineUsers),
      LOGIN_THREADS: String(config.spikePeakUsers),
      BASELINE_SEC: String(config.baselineDurationSec),
      SPIKE_TRIGGER_SEC: String(config.spikeTriggerDurationSec),
      SPIKE_HOLD_SEC: String(config.spikeHoldDurationSec),
      RECOVERY_SEC: String(config.recoveryDurationSec),
      POST_SPIKE_SEC: String(config.postSpikeDurationSec),
    },
  });
} catch (e) {
  console.error("⚠️  Phase summary generation had issues");
}

console.log("\n✅ Smoke test complete!");

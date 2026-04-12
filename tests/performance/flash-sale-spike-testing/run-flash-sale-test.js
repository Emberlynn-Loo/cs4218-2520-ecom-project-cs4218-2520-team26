#!/usr/bin/env node

"use strict";

const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const config = require("./flash-sale-config.js");
const t      = config.timing;

const RESULTS_DIR = path.join(__dirname, "results");
const JTL_FILE    = path.join(RESULTS_DIR, "flash-sale-spike.jtl");
const REPORT_DIR  = path.join(RESULTS_DIR, "flash-sale-spike-report");
const LOG_FILE    = path.join(RESULTS_DIR, "jmeter.log");
const JMX_FILE    = path.join(__dirname, "jmeter", "flash-sale-spike-test.jmx");

// ── Banner ────────────────────────────────────────────────────────────────────

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║      Flash-Sale Product Page Surge — Spike Test Runner      ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log();
console.log(`Profile     : ${config.name}`);
console.log(`Target      : ${config.protocol}://${config.host}:${config.port}`);
console.log();
console.log("Thread Groups:");
console.log(`  Phase 1  Baseline   ${config.baselineUsers} users  (entire test, ~${t.p1Duration}s)`);
console.log(`  Phase 2  Spike      ${config.spikePeakUsers} users  — starts at +${t.p2Delay}s, ramp=${t.p2Rampup}s, hold=${t.p2Duration}s`);
console.log(`  Phase 3  Cart burst ${config.cartUsers} users  — starts at +${t.p3Delay}s (concurrent with spike)`);
console.log(`  Phase 4  Recovery   ${config.baselineUsers} users  — starts at +${t.p4Delay}s, ramp=${t.p4Rampup}s, hold=${t.p4Duration}s`);
console.log(`  Phase 5  Post-spike ${config.baselineUsers} users  — starts at +${t.p5Delay}s, duration=${t.p5Duration}s`);
console.log();
console.log(`Latency threshold : ${config.latencyThresholdMs} ms`);
console.log(`Total test time   : ~${Math.ceil(t.p1Duration / 60)} min`);
console.log();

// ── Ensure results dir exists; clean stale files ──────────────────────────────

fs.mkdirSync(RESULTS_DIR, { recursive: true });
console.log("Cleaning up stale results...");
try {
  fs.rmSync(JTL_FILE,   { force: true });
  fs.rmSync(REPORT_DIR, { recursive: true, force: true });
} catch (_) { /* ignore */ }

// ── Build JMeter command ──────────────────────────────────────────────────────
const jmeterArgs = [
  "jmeter",
  "-Jhttpclient4.time_to_live=20000",
  "-Jhttpclient4.idle_timeout=10000",
  "-Jhttpclient4.max_conn_per_route=25",
  "-n -t",
  `"${JMX_FILE}"`,
  `-j "${LOG_FILE}"`,

  // Server
  `-JPROTOCOL=${config.protocol}`,
  `-JHOST=${config.host}`,
  `-JPORT=${config.port}`,

  // User counts — names must match ${__P(NAME,...)} in the JMX
  `-JBASELINE_USERS=${config.baselineUsers}`,
  `-JBASELINE_RAMP_SECONDS=${config.baselineRampSeconds}`,
  `-JSPIKE_PEAK_USERS=${config.spikePeakUsers}`,
  `-JCART_USERS=${config.cartUsers}`,

  // Data sources
  `-JCREDENTIALS_CSV=${config.credentialsCsv}`,
  `-JPRODUCTS_CSV=${config.productsCsv}`,

  // Fallback values
  `-JDEFAULT_EMAIL=${config.defaultEmail}`,
  `-JDEFAULT_PASSWORD=${config.defaultPassword}`,
  `-JDEFAULT_SLUG=${config.defaultSlug}`,

  // Latency threshold
  `-JLATENCY_THRESHOLD_MS=${config.latencyThresholdMs}`,

  // Phase 1 (baseline — runs full test)
  `-JP1_DURATION=${t.p1Duration}`,

  // Phase 2 (product detail spike)
  `-JP2_DELAY=${t.p2Delay}`,
  `-JP2_RAMPUP=${t.p2Rampup}`,
  `-JP2_DURATION=${t.p2Duration}`,

  // Phase 3 (add-to-cart auth burst — concurrent with Phase 2)
  `-JP3_DELAY=${t.p3Delay}`,
  `-JP3_RAMPUP=${t.p3Rampup}`,
  `-JP3_DURATION=${t.p3Duration}`,

  // Phase 4 (recovery)
  `-JP4_DELAY=${t.p4Delay}`,
  `-JP4_RAMPUP=${t.p4Rampup}`,
  `-JP4_DURATION=${t.p4Duration}`,

  // Phase 5 (post-spike observation)
  `-JP5_DELAY=${t.p5Delay}`,
  `-JP5_DURATION=${t.p5Duration}`,

  // JTL output
  `-l "${JTL_FILE}"`,
].join(" ");

// ── Run JMeter ────────────────────────────────────────────────────────────────

console.log("Running JMeter spike test...");
try {
  execSync(jmeterArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
} catch (e) {
  console.error("\nJMeter test failed (exit code non-zero). Check jmeter.log.");
  process.exit(1);
}

// ── Generate HTML report ──────────────────────────────────────────────────────

console.log("\nGenerating JMeter HTML report...");
const reportCmd = `jmeter -g "${JTL_FILE}" -o "${REPORT_DIR}"`;
try {
  execSync(reportCmd, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
} catch (e) {
  console.warn("HTML report generation had issues — raw JTL data is still usable.");
}

// ── Generate phase summary ────────────────────────────────────────────────────

console.log("\nGenerating phase summary...");
const summaryScript = path.join(__dirname, "generate_phase_summary.cjs");
const summaryCmd    = `node "${summaryScript}"`;

try {
  execSync(summaryCmd, {
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd:   path.join(__dirname, "..", "..", ".."),
    env: {
      ...process.env,
      JTL_PATH:         JTL_FILE,
      OUT_DIR:          RESULTS_DIR,
      BASELINE_USERS:   String(config.baselineUsers),
      SPIKE_USERS:      String(config.spikePeakUsers),
      CART_USERS:       String(config.cartUsers),
      BASELINE_SEC:     String(t.baselineSec),
      SPIKE_TRIGGER_SEC:String(t.spikeTriggerSec),
      SPIKE_HOLD_SEC:   String(t.spikeHoldSec),
      RECOVERY_SEC:     String(t.recoverySec),
      POST_SPIKE_SEC:   String(t.postSpikeSec),
    },
  });
} catch (e) {
  console.warn("Phase summary generation had issues.");
}

// ── Done ──────────────────────────────────────────────────────────────────────

console.log("\nFlash-sale spike test complete!");
console.log(`  JTL raw data : ${JTL_FILE}`);
console.log(`  HTML report  : ${REPORT_DIR}/index.html`);
console.log(`  Phase JSON   : ${path.join(RESULTS_DIR, "flash-sale-spike-phase-summary.json")}`);
console.log(`  Phase CSV    : ${path.join(RESULTS_DIR, "flash-sale-spike-phase-summary.csv")}`);

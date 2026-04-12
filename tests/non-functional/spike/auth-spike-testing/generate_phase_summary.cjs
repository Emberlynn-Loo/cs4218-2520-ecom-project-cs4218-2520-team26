// Created by Nicholas Koh Zi Lun, A0272806B

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const JTL_PATH =
  process.env.JTL_PATH || "tests/performance/auth-spike-testing/results/auth-spike.jtl";
const OUT_DIR = process.env.OUT_DIR || "tests/performance/auth-spike-testing/results";

const PHASE_DURATIONS_SEC = {
  baseline: Number(process.env.BASELINE_SEC || 300),
  trigger: Number(process.env.SPIKE_TRIGGER_SEC || 30),
  hold: Number(process.env.SPIKE_HOLD_SEC || 120),
  recovery: Number(process.env.RECOVERY_SEC || 120),
  post: Number(process.env.POST_SPIKE_SEC || 300),
};

// TARGET_USERS describes the intended concurrent user count per phase.
const TARGET_USERS = {
  baseline: Number(process.env.BASELINE_USERS || 500),
  trigger: `${process.env.BASELINE_USERS || 500}->${process.env.LOGIN_THREADS || 10000}`,
  hold: Number(process.env.LOGIN_THREADS || 10000),
  recovery: `${process.env.LOGIN_THREADS || 10000}->${process.env.BASELINE_USERS || 500}`,
  post: Number(process.env.BASELINE_USERS || 500),
};

function parseCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  out.push(current);
  return out;
}

function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function msToMinSec(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatPct(value) {
  return `${value.toFixed(2)}%`;
}

function formatMs(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function buildPhases() {
  const order = [
    ["baseline", "Baseline"],
    ["trigger", "Spike Trigger"],
    ["hold", "Spike Duration"],
    ["recovery", "Recovery"],
    ["post", "Post-Spike Observation"],
  ];

  let startSec = 0;
  return order.map(([key, label]) => {
    const duration = PHASE_DURATIONS_SEC[key];
    const phase = {
      key,
      label,
      startSec,
      endSec: startSec + duration,
      targetUsers: TARGET_USERS[key],
      samples: 0,
      failures: 0,
      elapsedSum: 0,
      maxThreads: 0,
      observedThreadsSum: 0,
      observedThreadsCount: 0,
    };
    startSec += duration;
    return phase;
  });
}

function rowToPhase(phase, row) {
  phase.samples += 1;
  phase.elapsedSum += safeNum(row.elapsed, 0);

  if (String(row.success).toLowerCase() !== "true") {
    phase.failures += 1;
  }

  const allThreads = safeNum(row.allThreads, 0);
  phase.maxThreads = Math.max(phase.maxThreads, allThreads);
  if (allThreads > 0) {
    phase.observedThreadsSum += allThreads;
    phase.observedThreadsCount += 1;
  }
}

function finalizePhase(phase) {
  const avgMs = phase.samples > 0 ? phase.elapsedSum / phase.samples : 0;
  const errPct = phase.samples > 0 ? (phase.failures / phase.samples) * 100 : 0;
  const avgThreads =
    phase.observedThreadsCount > 0
      ? phase.observedThreadsSum / phase.observedThreadsCount
      : 0;

  return {
    timeWindow: `${msToMinSec(phase.startSec * 1000)}-${msToMinSec(phase.endSec * 1000)}`,
    phase: phase.label,
    targetUsers: String(phase.targetUsers),
    avgObservedThreads: Number(avgThreads.toFixed(2)),
    peakObservedThreads: phase.maxThreads,
    samples: phase.samples,
    avgResponseMs: Number(avgMs.toFixed(2)),
    errorRatePct: Number(errPct.toFixed(2)),
    observation:
      errPct >= 10
        ? "Severe degradation"
        : errPct >= 3
          ? "Noticeable degradation"
          : errPct > 0
            ? "Minor errors"
            : "Stable",
  };
}

async function main() {
  if (!fs.existsSync(JTL_PATH)) {
    throw new Error(`JTL file not found: ${JTL_PATH}`);
  }

  const phases = buildPhases();
  let startTimestamp = null;
  let headers = null;

  const rl = readline.createInterface({
    input: fs.createReadStream(JTL_PATH, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) {
      continue;
    }

    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }

    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] || "";
    });

    const ts = safeNum(row.timeStamp, NaN);
    if (!Number.isFinite(ts)) {
      continue;
    }

    if (startTimestamp === null) {
      startTimestamp = ts;
    }

    const elapsedSecFromStart = (ts - startTimestamp) / 1000;
    const phase = phases.find(
      (p) =>
        elapsedSecFromStart >= p.startSec && elapsedSecFromStart < p.endSec,
    );

    if (!phase) {
      continue;
    }

    rowToPhase(phase, row);
  }

  const summary = phases.map(finalizePhase);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const jsonPath = path.join(OUT_DIR, "auth-spike-phase-summary.json");
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), "utf8");

  const csvHeader = [
    "timeWindow",
    "phase",
    "targetUsers",
    "avgObservedThreads",
    "peakObservedThreads",
    "samples",
    "avgResponseMs",
    "errorRatePct",
    "observation",
  ];
  const csvRows = summary.map((s) =>
    [
      s.timeWindow,
      s.phase,
      s.targetUsers,
      s.avgObservedThreads,
      s.peakObservedThreads,
      s.samples,
      s.avgResponseMs,
      s.errorRatePct,
      s.observation,
    ]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(","),
  );
  const csvPath = path.join(OUT_DIR, "auth-spike-phase-summary.csv");
  fs.writeFileSync(
    csvPath,
    [csvHeader.join(","), ...csvRows].join("\n"),
    "utf8",
  );

  console.log("Lab-style phase summary generated:");
  summary.forEach((s) => {
    console.log(
      `${s.timeWindow} | ${s.phase} | target=${s.targetUsers} | avg=${formatMs(s.avgResponseMs)} ms | error=${formatPct(s.errorRatePct)} | samples=${s.samples}`,
    );
  });
  console.log(`\nJSON: ${jsonPath}`);
  console.log(`CSV : ${csvPath}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

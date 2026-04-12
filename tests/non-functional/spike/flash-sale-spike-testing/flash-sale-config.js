// Created by Nicholas Koh Zi Lun, A0272806B

const common = {
  protocol: "http",
  host:     "localhost",
  port:     6060,
  credentialsCsv: "tests/non-functional/spike/flash-sale-spike-testing/jmeter/flash-sale-users.csv",
  productsCsv:    "tests/non-functional/spike/flash-sale-spike-testing/jmeter/flash-sale-products.csv",
  defaultEmail:    "flash-user-01@team26.local",
  defaultPassword: "FlashPass@1",
  defaultSlug:     "flash-sale-product-1",
  latencyThresholdMs: 5000,
};

const profiles = {
  smoke: {
    name: "smoke",

    // User load
    baselineUsers:  10,
    spikePeakUsers: 200,
    cartUsers:      100,

    // Timing (seconds)
    baselineRampSeconds:     5,
    baselineDurationSec:     30,
    spikeTriggerDurationSec: 5,
    spikeHoldDurationSec:    30,
    recoveryRampSec:         5,
    recoveryDurationSec:     25,
    postSpikeDurationSec:    30,
  },

  actual: {
    name: "actual",

    // User load
    baselineUsers:  200,
    spikePeakUsers: 5000,
    cartUsers:      2500,

    // Timing (seconds)
    baselineRampSeconds:     30,
    baselineDurationSec:     300,
    spikeTriggerDurationSec: 15,
    spikeHoldDurationSec:    120,
    recoveryRampSec:         60,
    recoveryDurationSec:     120,
    postSpikeDurationSec:    180,
  },
};

const aliases = { full: "actual" };

const requestedProfile = (process.env.PERF_PROFILE || "smoke").trim().toLowerCase();
const selectedProfileName = aliases[requestedProfile] || requestedProfile;
const selectedProfile = profiles[selectedProfileName] || profiles.smoke;

const cfg = { ...common, ...selectedProfile };

const p2Delay    = cfg.baselineRampSeconds + cfg.baselineDurationSec;
const p2Rampup   = cfg.spikeTriggerDurationSec;
const p2Duration = cfg.spikeHoldDurationSec;

const p3Delay    = p2Delay;
const p3Rampup   = cfg.spikeTriggerDurationSec;
const p3Duration = cfg.spikeHoldDurationSec;

const p4Delay    = p2Delay + p2Rampup + p2Duration;
const p4Rampup   = cfg.recoveryRampSec;
const p4Duration = cfg.recoveryDurationSec;

const p5Delay    = p4Delay + p4Rampup + p4Duration;
const p5Duration = cfg.postSpikeDurationSec;

const p1Duration = p5Delay + p5Duration;

cfg.timing = {
  p1Duration,
  p2Delay, p2Rampup, p2Duration,
  p3Delay, p3Rampup, p3Duration,
  p4Delay, p4Rampup, p4Duration,
  p5Delay, p5Duration,

  baselineSec:     cfg.baselineRampSeconds + cfg.baselineDurationSec,
  spikeTriggerSec: cfg.spikeTriggerDurationSec,
  spikeHoldSec:    cfg.spikeHoldDurationSec,
  recoverySec:     cfg.recoveryRampSec + cfg.recoveryDurationSec,
  postSpikeSec:    cfg.postSpikeDurationSec,
};

module.exports = cfg;

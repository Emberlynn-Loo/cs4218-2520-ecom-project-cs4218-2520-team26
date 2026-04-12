/**
 * Performance Test Configuration
 *
 * Scenario: "Lightning Deal" auth spike
 *   - Baseline: BASELINE_USERS browsing (typical daytime traffic)
 *   - Spike trigger: total users surge from BASELINE_USERS to SPIKE_PEAK_USERS
 *     over SPIKE_TRIGGER_SEC seconds
 *   - Spike hold: SPIKE_PEAK_USERS maintained for SPIKE_HOLD_SEC seconds
 *   - Recovery: load ramps back to BASELINE_USERS over RECOVERY_SEC seconds
 *   - Post-spike: BASELINE_USERS observed for POST_SPIKE_SEC seconds
 *
 * Profiles:
 * - smoke: scaled-down sanity run (~2 min total)
 * - actual: full load matching the described spike scenario (~15 min total)
 * - full: alias of actual (backward compatible)
 *
 * Usage:
 * - Default (smoke): npm run test:perf:auth-spike:smoke
 * - Actual profile: $env:PERF_PROFILE="actual"; npm run test:perf:auth-spike:smoke
 *
 * Prerequisites: all users in auth-users.csv must be pre-seeded in the DB.
 * 
 * Created by Nicholas Koh Zi Lun, A0272806B
 */

const common = {
  protocol: "http",
  host: "localhost",
  port: 6060,
  credentialsCsv: "tests/non-functional/spike/auth-spike-testing/jmeter/auth-users.csv",
  defaultEmail: "spike-user-01@team26.local",
  defaultPassword: "SpikePass@1",
  // Login samples exceeding this threshold (ms) are flagged as latency failures.
  loginLatencyThresholdMs: 5000,
};

const profiles = {
  smoke: {
    name: "smoke",

    // User load
    baselineUsers: 10,
    spikePeakUsers: 100,

    // Timing (seconds)
    baselineRampSeconds: 5,
    baselineDurationSec: 30,
    spikeTriggerDurationSec: 10,
    spikeHoldDurationSec: 30,
    recoveryRampSec: 5,
    recoveryDurationSec: 20,
    postSpikeDurationSec: 30,
  },
  actual: {
    name: "actual",

    // User load
    baselineUsers: 500,
    spikePeakUsers: 10000,

    // Timing (seconds)
    baselineRampSeconds: 30,
    baselineDurationSec: 300,
    spikeTriggerDurationSec: 30,
    spikeHoldDurationSec: 120,
    recoveryRampSec: 60,
    recoveryDurationSec: 120,
    postSpikeDurationSec: 300,
  },
};

const aliases = {
  full: "actual",
};

const requestedProfile = (process.env.PERF_PROFILE || "smoke")
  .trim()
  .toLowerCase();
const selectedProfileName = aliases[requestedProfile] || requestedProfile;
const selectedProfile = profiles[selectedProfileName] || profiles.smoke;

module.exports = {
  ...common,
  ...selectedProfile,
};

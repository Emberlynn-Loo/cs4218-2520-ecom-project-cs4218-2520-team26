# Emberlynn Loo, A0255614E
# run-recovery-test.sh
# ─────────────────────────────────────────────────────────────────────────────
# Orchestrates the DB recovery test:
#   1. Start the server with fault injection enabled
#   2. Launch k6 (90 s, 20 VUs)
#   3. At t=30 s after k6 VUs start → inject DB disconnection
#   4. At t=60 s → restore DB connection
#   5. Wait for k6 to finish the recovery phase, then print results
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
RECOVERY_DIR="${PROJECT_ROOT}/tests/non-functional/recovery"

K6_SCRIPT="${RECOVERY_DIR}/k6-db-recovery-traffic.js"
SERVER_LOG="${RECOVERY_DIR}/server-recovery-test.log"
K6_JSON_LOG="${RECOVERY_DIR}/k6-recovery-test.log"
BASE_URL="${BASE_URL:-http://localhost:6060}"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

SERVER_PID=""
cleanup() {
    log "Cleaning up..."
    if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
        kill "${SERVER_PID}" 2>/dev/null || true
        log "Server stopped"
    fi
}
trap cleanup EXIT

if [[ ! -f "${K6_SCRIPT}" ]]; then
    echo "ERROR: k6 script not found at ${K6_SCRIPT}"
    exit 1
fi

log "Project root : ${PROJECT_ROOT}"
log "k6 script    : ${K6_SCRIPT}"
log "Server log   : ${SERVER_LOG}"
log "k6 JSON log  : ${K6_JSON_LOG}"

log "Starting server (fault injection ENABLED)..."
ENABLE_FAULT_INJECTION=true \
NODE_ENV=development \
    node "${PROJECT_ROOT}/server.js" > "${SERVER_LOG}" 2>&1 &
SERVER_PID=$!
log "Server PID: ${SERVER_PID}  (logs → ${SERVER_LOG})"

log "Waiting for server to boot..."
for i in $(seq 1 15); do
    sleep 1
    if curl -sf "${BASE_URL}/healthz" > /dev/null 2>&1; then
        log "Server is healthy ✓"
        break
    fi
    if [[ $i -eq 15 ]]; then
        log "ERROR: Server did not become healthy after 15 s"
        cat "${SERVER_LOG}"
        exit 1
    fi
done

STATUS_RESP=$(curl -sf "${BASE_URL}/_test/db/status" 2>/dev/null || echo "FAILED")
if [[ "${STATUS_RESP}" == "FAILED" ]]; then
    log "ERROR: Fault injection routes not reachable. Is ENABLE_FAULT_INJECTION=true set?"
    exit 1
fi
log "Fault injection routes active ✓"

log "Starting k6 load test (90 s)..."
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s \
k6 run \
    --out "json=${K6_JSON_LOG}" \
    --env "BASE_URL=${BASE_URL}" \
    "${K6_SCRIPT}" &
K6_PID=$!
log "k6 PID: ${K6_PID}"

log "Baseline phase running for 30s..."
sleep 30

log "Injecting DB disconnection (simulating Atlas connectivity loss)..."
DISCONNECT_RESP=$(curl -sf -X POST \
    -H "Content-Type: application/json" \
    -d '{"durationMs":30000}' \
    "${BASE_URL}/_test/db/disconnect" 2>/dev/null || echo "FAILED")
log "Disconnect response: ${DISCONNECT_RESP}"

if [[ "${DISCONNECT_RESP}" == "FAILED" ]]; then
    log "WARNING: Could not inject DB disconnect – test will continue but failure phase may not work"
fi

log "Failure window active for 30s..."
sleep 30

log "Restoring DB connection (simulating Atlas connectivity restored)..."
RECONNECT_RESP=$(curl -sf -X POST \
    "${BASE_URL}/_test/db/reconnect" 2>/dev/null || echo "FAILED")
log "Reconnect response: ${RECONNECT_RESP}"

READY_STATE=$(curl -sf "${BASE_URL}/_test/db/status" 2>/dev/null \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('readyState','?'))" 2>/dev/null \
    || echo "?")
log "DB readyState after reconnect: ${READY_STATE} (expected: 1)"

log "Waiting for k6 to finish the recovery phase..."
wait "${K6_PID}" || true
K6_EXIT=$?

echo ""
echo "================================================================"
log "k6 test finished with exit code ${K6_EXIT}"
log "Check threshold results above – failure_graceful_rate is expected"
log "to pass even if some requests returned 503 during the failure window."
echo "================================================================"
echo ""
log "Logs:"
log "  Server log : ${SERVER_LOG}"
log "  k6 JSON log: ${K6_JSON_LOG}"
echo ""
log "Done."

exit "${K6_EXIT}"
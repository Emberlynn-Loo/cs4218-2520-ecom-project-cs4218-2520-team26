// Emberlynn Loo, A0255614E

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";

const requestDuration = new Trend("request_duration");
const failedRequests = new Counter("failed_requests");
const successfulRequests = new Counter("successful_requests");
const errorRate = new Rate("error_rate");
const failureWindowStart = new Trend("failure_window_start_ms");

export const options = {
    scenarios: {
        continuous_traffic: {
            executor: "constant-vus",
            vus: 20,
            duration: "30s",
        },
    },
    thresholds: {
        http_req_duration: ["p(95)<5000"],
    },
};

function login(email, password) {
    const res = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({ email, password }),
        { headers: { "Content-Type": "application/json" } }
    );
    const body = res.json();
    return body?.token || null;
}

export function setup() {
    const userToken = login("cs4218@test.com", "cs4218@test.com");
    const adminToken = login("admin@test.sg", "admin@test.sg");
    return { userToken, adminToken };
}

export default function (data) {
    const headers = { Authorization: data.userToken };
    const adminHeaders = { Authorization: data.adminToken };

    // Test 1: Product listing (read operation)
    const productRes = http.get(
        `${BASE_URL}/api/v1/product/product-list/1`,
        { headers }
    );
    requestDuration.add(productRes.timings.duration);

    const productOk = check(productRes, {
        "product list status 200": (r) => r.status === 200,
    });
    if (!productOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now()); // record timestamp of failure
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);

    // Test 2: Category fetch (read operation)
    const catRes = http.get(
        `${BASE_URL}/api/v1/category/get-category`,
        { headers }
    );
    requestDuration.add(catRes.timings.duration);

    const catOk = check(catRes, {
        "category list status 200": (r) => r.status === 200,
    });
    if (!catOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now());
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);

    // Test 3: Order retrieval (read operation)
    const orderRes = http.get(
        `${BASE_URL}/api/v1/auth/orders`,
        { headers }
    );
    requestDuration.add(orderRes.timings.duration);

    const orderOk = check(orderRes, {
        "order retrieval status 200": (r) => r.status === 200,
    });
    if (!orderOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now());
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);

    // Test 4: Session validation (user auth check)
    const userAuthRes = http.get(
        `${BASE_URL}/api/v1/auth/user-auth`,
        { headers }
    );
    requestDuration.add(userAuthRes.timings.duration);

    const userAuthOk = check(userAuthRes, {
        "user auth status 200": (r) => r.status === 200,
    });
    if (!userAuthOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now());
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);

    // Test 5: Re-login (authentication post-restart)
    const loginRes = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({ email: "cs4218@test.com", password: "cs4218@test.com" }),
        { headers: { "Content-Type": "application/json" } }
    );
    requestDuration.add(loginRes.timings.duration);

    const loginOk = check(loginRes, {
        "login status 200": (r) => r.status === 200,
    });
    if (!loginOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now());
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);

    // Test 6: Admin auth validation
    const adminAuthRes = http.get(
        `${BASE_URL}/api/v1/auth/admin-auth`,
        { headers: adminHeaders }
    );
    requestDuration.add(adminAuthRes.timings.duration);

    const adminAuthOk = check(adminAuthRes, {
        "admin auth status 200": (r) => r.status === 200,
    });
    if (!adminAuthOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now());
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);

    // Test 7: Admin order management
    const adminOrdersRes = http.get(
        `${BASE_URL}/api/v1/auth/all-orders`,
        { headers: adminHeaders }
    );
    requestDuration.add(adminOrdersRes.timings.duration);

    const adminOrdersOk = check(adminOrdersRes, {
        "admin all orders status 200": (r) => r.status === 200,
    });
    if (!adminOrdersOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now());
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);

    // Test 8: Health check recovery
    const healthRes = http.get(`${BASE_URL}/healthz`);
    requestDuration.add(healthRes.timings.duration);

    const healthOk = check(healthRes, {
        "health check status 200": (r) => r.status === 200,
    });
    if (!healthOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now());
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);
}

export function teardown(data) {
    console.log("\n[teardown] ── Post-recovery integrity checks ──────────────────");

    const headers = { Authorization: data.userToken };
    const adminHeaders = { Authorization: data.adminToken };

    // 1. Verify product listing works
    const productRes = http.get(
        `${BASE_URL}/api/v1/product/product-list/1`,
        { headers, timeout: "10s" }
    );
    const productOk = check(productRes, {
        "[teardown] products accessible after recovery": (r) => r.status === 200,
    });
    console.log(`[teardown] Product access check passed: ${productOk}`);

    // 2. Verify categories work
    const catRes = http.get(
        `${BASE_URL}/api/v1/category/get-category`,
        { headers, timeout: "10s" }
    );
    const catOk = check(catRes, {
        "[teardown] categories accessible after recovery": (r) => r.status === 200,
    });
    console.log(`[teardown] Category access check passed: ${catOk}`);

    // 3. Verify orders accessible
    const orderRes = http.get(
        `${BASE_URL}/api/v1/auth/orders`,
        { headers, timeout: "10s" }
    );
    const orderOk = check(orderRes, {
        "[teardown] orders accessible after recovery": (r) => r.status === 200,
    });
    console.log(`[teardown] Order access check passed: ${orderOk}`);

    // 4. Verify auth still works
    const loginRes = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({ email: "cs4218@test.com", password: "cs4218@test.com" }),
        { headers: { "Content-Type": "application/json" }, timeout: "10s" }
    );
    const authOk = check(loginRes, {
        "[teardown] authentication works after recovery": (r) => r.status === 200,
    });
    console.log(`[teardown] Auth check passed: ${authOk}`);

    // 5. Verify admin endpoints
    const adminAuthRes = http.get(
        `${BASE_URL}/api/v1/auth/admin-auth`,
        { headers: adminHeaders, timeout: "10s" }
    );
    const adminOk = check(adminAuthRes, {
        "[teardown] admin auth works after recovery": (r) => r.status === 200,
    });
    console.log(`[teardown] Admin auth check passed: ${adminOk}`);

    // 6. Verify health check
    const healthRes = http.get(`${BASE_URL}/healthz`, { timeout: "5s" });
    const healthOk = check(healthRes, {
        "[teardown] health check returns 200 after recovery": (r) => r.status === 200,
    });
    console.log(`[teardown] Health check passed: ${healthOk}`);

    console.log("[teardown] ── Integrity checks complete ───────────────────\n");
}
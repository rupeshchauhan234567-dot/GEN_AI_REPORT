const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_secret_that_is_long_enough_for_smoke_tests";
process.env.GOOGLE_GENAI_API_KEY = "test-key";
process.env.CORS_ORIGINS = "http://localhost:5173";

const app = require("../src/app");
let server;
let baseUrl;

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("health endpoint responds with status ok", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, "ok");
});

test("protected report endpoint rejects requests without a session cookie", async () => {
    const response = await fetch(`${baseUrl}/api/interview/`);
    assert.equal(response.status, 401);
});

test("CORS rejects an origin that is not allowlisted", async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: "https://not-allowed.example" }
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).message, "Origin is not allowed by CORS");
});

test("workspace APIs reject requests without a session cookie", async () => {
    const response = await fetch(`${baseUrl}/api/hub/items`);
    assert.equal(response.status, 401);
});

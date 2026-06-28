const assert = require("node:assert/strict");
const test = require("node:test");
const {createApp} = require("../src/app");

function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]));
  return {
    async get(key) {
      return data.has(key) ? JSON.parse(JSON.stringify(data.get(key))) : null;
    },
    async put(key, value) {
      data.set(key, JSON.parse(JSON.stringify(value)));
    },
    dump() {
      return Object.fromEntries(data.entries());
    }
  };
}

async function call(app, method, path, body, token) {
  return app.handle({
    method,
    path,
    headers: token ? {authorization: `Bearer ${token}`} : {},
    query: {},
    body: body == null ? "" : JSON.stringify(body)
  });
}

test("membership endpoints require a valid parent token", async () => {
  const app = createApp({storage: memoryStorage(), tokenSecret: "test-secret"});
  const res = await call(app, "GET", "/api/membership");
  assert.equal(res.statusCode, 401);
});

test("redeeming a monthly code binds membership to the parent account", async () => {
  const storage = memoryStorage();
  const app = createApp({storage, tokenSecret: "test-secret"});
  const registered = await call(app, "POST", "/api/register", {
    username: "parent@example.com",
    password: "123456",
    displayName: "妈妈"
  });
  assert.equal(registered.statusCode, 200);
  const token = JSON.parse(registered.body).token;

  const redeemed = await call(app, "POST", "/api/membership/redeem", {code: "YUEKA2026"}, token);
  assert.equal(redeemed.statusCode, 200);
  const payload = JSON.parse(redeemed.body);
  assert.equal(payload.membership.plan, "month");
  assert.equal(payload.membership.label, "月卡");
  assert.equal(payload.membership.owner, "parent@example.com");
  assert.equal(payload.membership.usedCodes.includes("YUEKA2026"), true);

  const status = await call(app, "GET", "/api/membership", null, token);
  assert.equal(status.statusCode, 200);
  assert.equal(JSON.parse(status.body).membership.plan, "month");
});

test("the same redemption code cannot be reused by the same parent", async () => {
  const app = createApp({storage: memoryStorage(), tokenSecret: "test-secret"});
  const registered = await call(app, "POST", "/api/register", {
    username: "parent@example.com",
    password: "123456",
    displayName: "妈妈"
  });
  const token = JSON.parse(registered.body).token;

  assert.equal((await call(app, "POST", "/api/membership/redeem", {code: "JIKA2026"}, token)).statusCode, 200);
  const second = await call(app, "POST", "/api/membership/redeem", {code: "JIKA2026"}, token);
  assert.equal(second.statusCode, 409);
  assert.match(JSON.parse(second.body).error, /已经兑换/);
});

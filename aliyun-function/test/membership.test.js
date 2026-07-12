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
  const app = createApp({storage, tokenSecret: "test-secret", adminPassword: "admin-pass"});
  const generated = await call(app, "POST", "/api/admin/redeem-codes", {
    adminPassword: "admin-pass",
    plan: "month",
    quantity: 1
  });
  const code = JSON.parse(generated.body).codes[0].code;
  const registered = await call(app, "POST", "/api/register", {
    username: "parent@example.com",
    password: "123456",
    displayName: "妈妈"
  });
  assert.equal(registered.statusCode, 200);
  const token = JSON.parse(registered.body).token;

  const redeemed = await call(app, "POST", "/api/membership/redeem", {code}, token);
  assert.equal(redeemed.statusCode, 200);
  const payload = JSON.parse(redeemed.body);
  assert.equal(payload.membership.plan, "month");
  assert.equal(payload.membership.label, "月卡");
  assert.equal(payload.membership.owner, "parent@example.com");
  assert.equal(payload.membership.usedCodes.includes(code), true);

  const status = await call(app, "GET", "/api/membership", null, token);
  assert.equal(status.statusCode, 200);
  assert.equal(JSON.parse(status.body).membership.plan, "month");
});

test("the same redemption code cannot be reused by the same parent", async () => {
  const app = createApp({storage: memoryStorage(), tokenSecret: "test-secret", adminPassword: "admin-pass"});
  const generated = await call(app, "POST", "/api/admin/redeem-codes", {
    adminPassword: "admin-pass",
    plan: "quarter",
    quantity: 1
  });
  const code = JSON.parse(generated.body).codes[0].code;
  const registered = await call(app, "POST", "/api/register", {
    username: "parent@example.com",
    password: "123456",
    displayName: "妈妈"
  });
  const token = JSON.parse(registered.body).token;

  assert.equal((await call(app, "POST", "/api/membership/redeem", {code}, token)).statusCode, 200);
  const second = await call(app, "POST", "/api/membership/redeem", {code}, token);
  assert.equal(second.statusCode, 409);
  assert.match(JSON.parse(second.body).error, /已经兑换/);
});

test("admin can generate one-time redeem codes", async () => {
  const app = createApp({storage: memoryStorage(), tokenSecret: "test-secret", adminPassword: "admin-pass"});

  const denied = await call(app, "POST", "/api/admin/redeem-codes", {
    adminPassword: "bad",
    plan: "month",
    quantity: 1
  });
  assert.equal(denied.statusCode, 401);

  const generated = await call(app, "POST", "/api/admin/redeem-codes", {
    adminPassword: "admin-pass",
    plan: "quarter",
    quantity: 2,
    note: "order-001"
  });
  assert.equal(generated.statusCode, 200);
  const codes = JSON.parse(generated.body).codes;
  assert.equal(codes.length, 2);
  assert.equal(codes[0].plan, "quarter");
  assert.match(codes[0].code, /^XUEBA-QTR-/);
});

test("generated redeem code can only be used once globally", async () => {
  const app = createApp({storage: memoryStorage(), tokenSecret: "test-secret", adminPassword: "admin-pass"});
  const generated = await call(app, "POST", "/api/admin/redeem-codes", {
    adminPassword: "admin-pass",
    plan: "year",
    quantity: 1
  });
  const code = JSON.parse(generated.body).codes[0].code;

  const firstParent = await call(app, "POST", "/api/register", {
    username: "first@example.com",
    password: "123456",
    displayName: "妈妈"
  });
  const firstToken = JSON.parse(firstParent.body).token;
  const redeemed = await call(app, "POST", "/api/membership/redeem", {code}, firstToken);
  assert.equal(redeemed.statusCode, 200);
  assert.equal(JSON.parse(redeemed.body).membership.plan, "year");

  const secondParent = await call(app, "POST", "/api/register", {
    username: "second@example.com",
    password: "123456",
    displayName: "爸爸"
  });
  const secondToken = JSON.parse(secondParent.body).token;
  const reused = await call(app, "POST", "/api/membership/redeem", {code}, secondToken);
  assert.equal(reused.statusCode, 409);
  assert.match(JSON.parse(reused.body).error, /已经兑换/);
});

test("parent can reset password with the family recovery code", async () => {
  const app = createApp({storage: memoryStorage(), tokenSecret: "test-secret", recoveryCode: "xueba2026"});
  const registered = await call(app, "POST", "/api/register", {
    username: "parent@example.com",
    password: "123456",
    displayName: "妈妈"
  });
  assert.equal(registered.statusCode, 200);

  const badLogin = await call(app, "POST", "/api/login", {
    username: "parent@example.com",
    password: "wrong123"
  });
  assert.equal(badLogin.statusCode, 401);

  const badCode = await call(app, "POST", "/api/password/reset", {
    username: "parent@example.com",
    password: "newpass123",
    recoveryCode: "bad-code"
  });
  assert.equal(badCode.statusCode, 403);

  const reset = await call(app, "POST", "/api/password/reset", {
    username: "parent@example.com",
    password: "newpass123",
    recoveryCode: "xueba2026"
  });
  assert.equal(reset.statusCode, 200);
  assert.ok(JSON.parse(reset.body).token);

  const login = await call(app, "POST", "/api/login", {
    username: "parent@example.com",
    password: "newpass123"
  });
  assert.equal(login.statusCode, 200);
});

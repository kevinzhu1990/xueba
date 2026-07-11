const crypto = require("node:crypto");

const DEFAULT_REDEEM_CODES = {
  YUEKA2026: {plan: "month", label: "月卡", days: 31, fee: "按月收费"},
  "XUEBA-MONTH-2026": {plan: "month", label: "月卡", days: 31, fee: "按月收费"},
  JIKA2026: {plan: "quarter", label: "季卡", days: 93, fee: "季度收费"},
  "XUEBA-QUARTER-2026": {plan: "quarter", label: "季卡", days: 93, fee: "季度收费"},
  NIANKA2026: {plan: "year", label: "年卡", days: 366, fee: "年度收费"},
  "XUEBA-YEAR-2026": {plan: "year", label: "年卡", days: 366, fee: "年度收费"}
};

function normalizeUser(username) {
  return String(username || "").trim().toLowerCase();
}

function safeKey(value) {
  return encodeURIComponent(String(value || "").replace(/\//g, "_"));
}

function sha256(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

function passwordHash(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
}

function signToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token, secret) {
  if(!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if(!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try { return JSON.parse(Buffer.from(body, "base64url").toString()); } catch(e) { return null; }
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Max-Age": "86400"
    },
    body: JSON.stringify(payload)
  };
}

function parseBody(req) {
  if(!req.body) return {};
  if(typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body); } catch(e) { return {}; }
}

function bearer(req) {
  const h = req.headers || {};
  const value = h.authorization || h.Authorization || "";
  return String(value).replace(/^Bearer\s+/i, "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function addDays(baseIso, days) {
  const old = Date.parse(baseIso || "");
  const base = Math.max(Date.now(), Number.isNaN(old) ? 0 : old);
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function defaultCodeCatalog() {
  const fromEnv = process.env.REDEEM_CODES_JSON;
  if(fromEnv) {
    try { return JSON.parse(fromEnv); } catch(e) {}
  }
  return DEFAULT_REDEEM_CODES;
}

function createApp({
  storage,
  tokenSecret = process.env.TOKEN_SECRET || "change-me",
  redeemCodes = defaultCodeCatalog(),
  recoveryCode = process.env.RECOVERY_CODE || process.env.FAMILY_CODE || "xueba2026"
} = {}) {
  if(!storage) throw new Error("storage is required");

  async function currentUser(req) {
    const payload = verifyToken(bearer(req), tokenSecret);
    return payload && payload.uid ? normalizeUser(payload.uid) : null;
  }

  async function requireUser(req) {
    const uid = await currentUser(req);
    if(!uid) return {error: json(401, {error: "unauthorized"})};
    return {uid};
  }

  async function register(req) {
    const body = parseBody(req);
    const username = normalizeUser(body.username);
    const password = String(body.password || "");
    const displayName = String(body.displayName || "家长").trim() || "家长";
    if(!username || password.length < 6) return json(400, {error: "请输入账号和至少 6 位密码"});
    const key = `parents/${safeKey(username)}.json`;
    const existing = await storage.get(key);
    if(existing) return json(409, {error: "这个账号已注册，请直接登录"});
    const salt = crypto.randomBytes(16).toString("hex");
    const user = {username, displayName, salt, passwordHash: passwordHash(password, salt), createdAt: nowIso(), updatedAt: nowIso()};
    await storage.put(key, user);
    return json(200, {displayName, token: signToken({uid: username, role: "parent"}, tokenSecret)});
  }

  async function login(req) {
    const body = parseBody(req);
    const username = normalizeUser(body.username);
    const password = String(body.password || "");
    const user = await storage.get(`parents/${safeKey(username)}.json`);
    if(!user || user.passwordHash !== passwordHash(password, user.salt)) return json(401, {error: "账号或密码不正确"});
    return json(200, {displayName: user.displayName || "家长", token: signToken({uid: username, role: "parent"}, tokenSecret)});
  }

  async function resetPassword(req) {
    const body = parseBody(req);
    const username = normalizeUser(body.username);
    const password = String(body.password || "");
    const code = String(body.recoveryCode || "").trim();
    if(!username || password.length < 6) return json(400, {error: "请输入账号和至少 6 位新密码"});
    if(!recoveryCode || code !== recoveryCode) return json(403, {error: "家庭验证码不正确"});
    const key = `parents/${safeKey(username)}.json`;
    const user = await storage.get(key);
    if(!user) return json(404, {error: "这个账号还没有注册，请先注册家长账号"});
    const salt = crypto.randomBytes(16).toString("hex");
    const updated = {
      ...user,
      salt,
      passwordHash: passwordHash(password, salt),
      updatedAt: nowIso(),
      passwordResetAt: nowIso()
    };
    await storage.put(key, updated);
    return json(200, {
      displayName: updated.displayName || "家长",
      token: signToken({uid: username, role: "parent"}, tokenSecret)
    });
  }

  async function children(req) {
    const auth = await requireUser(req);
    if(auth.error) return auth.error;
    const key = `children/${safeKey(auth.uid)}.json`;
    if(req.method === "GET") return json(200, {children: (await storage.get(key)) || []});
    const list = Array.isArray(parseBody(req).children) ? parseBody(req).children : [];
    await storage.put(key, list);
    return json(200, {ok: true, children: list});
  }

  async function progress(req) {
    const auth = await requireUser(req);
    if(auth.error) return auth.error;
    if(req.method === "GET") {
      const child = req.query?.child || new URL(req.url || "http://local").searchParams.get("child");
      if(!child) return json(400, {error: "missing child"});
      return json(200, {store: (await storage.get(`progress/${safeKey(auth.uid)}/${safeKey(child)}.json`)) || {}});
    }
    const body = parseBody(req);
    if(!body.childId) return json(400, {error: "missing childId"});
    await storage.put(`progress/${safeKey(auth.uid)}/${safeKey(body.childId)}.json`, body.store || {});
    return json(200, {ok: true});
  }

  async function membership(req) {
    const auth = await requireUser(req);
    if(auth.error) return auth.error;
    const member = await storage.get(`memberships/${safeKey(auth.uid)}.json`);
    return json(200, {membership: member || null, active: !!(member && Date.parse(member.expiresAt) > Date.now())});
  }

  async function redeem(req) {
    const auth = await requireUser(req);
    if(auth.error) return auth.error;
    const code = String(parseBody(req).code || "").trim().toUpperCase();
    const item = redeemCodes[code];
    if(!item) return json(400, {error: "兑换码不正确，请检查大小写和横线。"});
    const key = `memberships/${safeKey(auth.uid)}.json`;
    const old = (await storage.get(key)) || {};
    const usedCodes = Array.isArray(old.usedCodes) ? old.usedCodes : [];
    if(usedCodes.includes(code)) return json(409, {error: "这个兑换码已经兑换过了，请换一个新的兑换码。"});
    const membership = {
      owner: auth.uid,
      plan: item.plan,
      label: item.label,
      fee: item.fee,
      expiresAt: addDays(old.expiresAt, item.days),
      lastCode: code,
      usedCodes: usedCodes.concat(code),
      updatedAt: nowIso()
    };
    await storage.put(key, membership);
    await storage.put(`redeems/${safeKey(code)}_${safeKey(auth.uid)}.json`, {code, owner: auth.uid, plan: item.plan, createdAt: nowIso()});
    return json(200, {membership, active: true});
  }

  async function handle(req) {
    if(req.method === "OPTIONS") return json(204, {});
    const path = req.path || new URL(req.url || "http://local/").pathname;
    if(path === "/" || path === "/health") return json(200, {ok: true, storage: "oss", node: process.version, tokenSecretSet: tokenSecret !== "change-me"});
    if(path === "/api/register" && req.method === "POST") return register(req);
    if(path === "/api/login" && req.method === "POST") return login(req);
    if(path === "/api/password/reset" && req.method === "POST") return resetPassword(req);
    if(path === "/api/children" && (req.method === "GET" || req.method === "PUT")) return children(req);
    if(path === "/api/progress" && (req.method === "GET" || req.method === "PUT")) return progress(req);
    if(path === "/api/membership" && req.method === "GET") return membership(req);
    if(path === "/api/membership/redeem" && req.method === "POST") return redeem(req);
    return json(404, {error: "no such route"});
  }

  return {handle};
}

module.exports = {createApp, DEFAULT_REDEEM_CODES};

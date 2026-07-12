const crypto = require("node:crypto");

const DEFAULT_REDEEM_CODES = {};

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

function planInfo(plan) {
  const map = {
    month: {plan: "month", label: "月卡", days: 31, fee: "按月收费"},
    quarter: {plan: "quarter", label: "季卡", days: 93, fee: "季度收费"},
    year: {plan: "year", label: "年卡", days: 366, fee: "年度收费"}
  };
  return map[String(plan || "").trim().toLowerCase()] || null;
}

function makeRedeemCode(plan) {
  const prefix = {month: "MON", quarter: "QTR", year: "YR"}[plan] || "VIP";
  const raw = crypto.randomBytes(6).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `XUEBA-${prefix}-${raw.slice(0, 8)}`;
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
  recoveryCode = process.env.RECOVERY_CODE || process.env.FAMILY_CODE || "xueba2026",
  adminPassword = process.env.ADMIN_PASSWORD || "xueba-admin-2026"
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
    const codeKey = `redeem-codes/${safeKey(code)}.json`;
    const generated = await storage.get(codeKey);
    const item = generated || redeemCodes[code];
    if(!item) return json(400, {error: "兑换码不正确，请检查大小写和横线。"});
    if(generated && generated.redeemedAt) return json(409, {error: "这个兑换码已经兑换过了，请换一个新的兑换码。"});
    const globalRedeemKey = `redeems/${safeKey(code)}.json`;
    const globalRedeem = await storage.get(globalRedeemKey);
    if(globalRedeem) return json(409, {error: "这个兑换码已经兑换过了，请换一个新的兑换码。"});
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
    const redeemed = {code, owner: auth.uid, plan: item.plan, redeemedAt: nowIso()};
    await storage.put(globalRedeemKey, redeemed);
    if(generated) await storage.put(codeKey, {...generated, owner: auth.uid, redeemedAt: redeemed.redeemedAt});
    return json(200, {membership, active: true});
  }

  async function generateRedeemCodes(req) {
    const body = parseBody(req);
    if(String(body.adminPassword || "") !== adminPassword) return json(401, {error: "管理员密码不正确"});
    const item = planInfo(body.plan);
    if(!item) return json(400, {error: "请选择月卡、季卡或年卡"});
    const quantity = Math.max(1, Math.min(100, Number(body.quantity) || 1));
    const note = String(body.note || "").trim().slice(0, 80);
    const codes = [];
    for(let i = 0; i < quantity; i++) {
      let code = "";
      for(let tries = 0; tries < 5; tries++) {
        code = makeRedeemCode(item.plan);
        if(!(await storage.get(`redeem-codes/${safeKey(code)}.json`))) break;
      }
      const record = {...item, code, note, createdAt: nowIso(), redeemedAt: "", owner: ""};
      await storage.put(`redeem-codes/${safeKey(code)}.json`, record);
      codes.push(record);
    }
    return json(200, {codes});
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
    if(path === "/api/admin/redeem-codes" && req.method === "POST") return generateRedeemCodes(req);
    return json(404, {error: "no such route"});
  }

  return {handle};
}

module.exports = {createApp, DEFAULT_REDEEM_CODES};

const crypto = require("node:crypto");

const DEFAULT_REDEEM_CODES = {};
const DEFAULT_PLANS = [
  {id:"trial-7",name:"7天体验会员",durationDays:7,price:0,enabled:true,sortOrder:1,benefits:["基础学科"]},
  {id:"month",name:"月卡",durationDays:31,price:0,enabled:true,sortOrder:2,benefits:["解锁全部学科"]},
  {id:"quarter",name:"季卡",durationDays:93,price:0,enabled:true,sortOrder:3,benefits:["解锁高级题库"]},
  {id:"half-year",name:"半年卡",durationDays:186,price:0,enabled:true,sortOrder:4,benefits:["解锁奥数和拓展"]},
  {id:"year",name:"年卡",durationDays:366,price:0,enabled:true,sortOrder:5,benefits:["全部学习权益"]},
  {id:"lifetime",name:"永久会员",durationDays:null,price:0,enabled:true,sortOrder:6,benefits:["永久有效"]}
];

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
  const actual = Buffer.from(sig);
  const wanted = Buffer.from(expected);
  if(actual.length !== wanted.length || !crypto.timingSafeEqual(actual, wanted)) return null;
  try { return JSON.parse(Buffer.from(body, "base64url").toString()); } catch(e) { return null; }
}

function parseAdminUsers(raw) {
  if(Array.isArray(raw)) return raw;
  try { return JSON.parse(String(raw || "[]")); } catch(e) { return []; }
}

function signAdminToken(admin, secret) {
  return signToken({kind:"admin",adminId:admin.id,username:admin.username,role:admin.role}, secret);
}

function roleRank(role) { return ({Operator:1,Admin:2,SuperAdmin:3}[role] || 0); }

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
  adminPassword = process.env.ADMIN_PASSWORD || "",
  adminUsers = parseAdminUsers(process.env.ADMIN_USERS_JSON),
  adminSecret = process.env.ADMIN_JWT_SECRET || tokenSecret
} = {}) {
  if(!storage) throw new Error("storage is required");

  async function currentUser(req) {
    const payload = verifyToken(bearer(req), tokenSecret);
    return payload && payload.uid ? normalizeUser(payload.uid) : null;
  }

  async function currentAdmin(req) {
    const payload=verifyToken(bearer(req),adminSecret);
    if(!payload || payload.kind!=="admin" || !payload.adminId) return null;
    const admin=adminUsers.find(x=>x.id===payload.adminId && x.enabled!==false);
    return admin && admin.role===payload.role ? admin : null;
  }

  async function requireAdmin(req, minimum="Operator") {
    const admin=await currentAdmin(req);
    if(!admin) return {error:json(401,{error:"管理员登录已失效"})};
    if(roleRank(admin.role)<roleRank(minimum)) return {error:json(403,{error:"没有执行此操作的权限"})};
    return {admin};
  }

  async function audit(admin, action, targetType, targetId, beforeData, afterData, req) {
    const id=`${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    await storage.put(`admin-logs/${id}.json`,{id,adminId:admin.id,action,targetType,targetId,beforeData:beforeData||null,afterData:afterData||null,createdAt:nowIso(),ipMasked:"masked",userAgent:String(req.headers?.["user-agent"]||req.headers?.["User-Agent"]||"").slice(0,180)});
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
    const user = {username, displayName, salt, passwordHash: passwordHash(password, salt), status:"active", createdAt: nowIso(), updatedAt: nowIso(), loginCount:0, lastLoginAt:null};
    await storage.put(key, user);
    return json(200, {displayName, token: signToken({uid: username, role: "parent"}, tokenSecret)});
  }

  async function login(req) {
    const body = parseBody(req);
    const username = normalizeUser(body.username);
    const password = String(body.password || "");
    const user = await storage.get(`parents/${safeKey(username)}.json`);
    if(!user || user.passwordHash !== passwordHash(password, user.salt)) return json(401, {error: "账号或密码不正确"});
    if(user.status==="frozen") return json(403,{error:"账号已被冻结，请联系客服"});
    user.loginCount=(Number(user.loginCount)||0)+1;user.lastLoginAt=nowIso();user.updatedAt=nowIso();await storage.put(`parents/${safeKey(username)}.json`,user);
    await storage.put(`login-events/${Date.now()}-${crypto.randomBytes(3).toString("hex")}.json`,{username,createdAt:user.lastLoginAt});
    return json(200, {displayName: user.displayName || "家长", token: signToken({uid: username, role: "parent"}, tokenSecret)});
  }

  async function adminLogin(req) {
    const body=parseBody(req),username=normalizeUser(body.username),password=String(body.password||"");
    const admin=adminUsers.find(x=>normalizeUser(x.username)===username && x.enabled!==false);
    if(!admin) {
      await storage.put(`admin-logs/${Date.now()}-${crypto.randomBytes(3).toString("hex")}.json`,{adminId:"unknown",action:"admin_login_failed",targetType:"admin",targetId:username||"unknown",createdAt:nowIso(),ipMasked:"masked",userAgent:""});
      return json(401,{error:"管理员账号或密码不正确"});
    }
    const valid=admin.passwordHash && admin.salt ? passwordHash(password,admin.salt)===admin.passwordHash : (adminPassword && password===adminPassword && admin.username===username);
    if(!valid) {
      await storage.put(`admin-logs/${Date.now()}-${crypto.randomBytes(3).toString("hex")}.json`,{adminId:admin.id,action:"admin_login_failed",targetType:"admin",targetId:admin.id,createdAt:nowIso(),ipMasked:"masked",userAgent:""});
      return json(401,{error:"管理员账号或密码不正确"});
    }
    const token=signAdminToken(admin,adminSecret);
    await storage.put(`admin-logs/${Date.now()}-${crypto.randomBytes(3).toString("hex")}.json`,{adminId:admin.id,action:"admin_login",targetType:"admin",targetId:admin.id,createdAt:nowIso(),ipMasked:"masked",userAgent:""});
    return json(200,{token,admin:{id:admin.id,username:admin.username,role:admin.role,name:admin.name||admin.username}});
  }

  async function adminDashboard(req) {
    const auth=await requireAdmin(req);if(auth.error)return auth.error;
    const keys=storage.list?await storage.list("parents/"):[];const users=[];
    for(const key of keys){const item=await storage.get(key);if(item)users.push(item);}
    const logs=storage.list?await storage.list("login-events/"):[];const redeem=storage.list?await storage.list("redeem-codes/"):[];const membership=storage.list?await storage.list("memberships/"):[];
    const today=nowIso().slice(0,10),todayLogs=[];for(const key of (storage.list?await storage.list("login-events/"):[])){const item=await storage.get(key);if(item?.createdAt?.slice(0,10)===today)todayLogs.push(item);}
    return json(200,{today:{newUsers:users.filter(x=>x.createdAt?.slice(0,10)===today).length,loginUsers:new Set(todayLogs.map(x=>x.username)).size,loginEvents:todayLogs.length},totals:{users:users.length,activeMembers:membership.length,redeemGenerated:redeem.length,questionCount:null,courseCount:null},notice:"题目、课程和访问统计将在接入聚合事件后显示；暂无足够数据时不展示伪造数值。"});
  }

  async function listAdminUsers(req) {
    const auth=await requireAdmin(req);if(auth.error)return auth.error;
    const params=new URL(req.url||"/","http://local").searchParams,page=Math.max(1,Number(params.get("page")||1)),pageSize=Math.min(100,Math.max(1,Number(params.get("pageSize")||20))),search=String(params.get("search")||"").toLowerCase();
    const keys=storage.list?await storage.list("parents/"):[],all=[];for(const key of keys){const item=await storage.get(key);if(item && (!search||item.username.includes(search)||String(item.displayName||"").toLowerCase().includes(search)))all.push({id:item.username,username:item.username,displayName:item.displayName,status:item.status||"active",createdAt:item.createdAt,lastLoginAt:item.lastLoginAt,loginCount:item.loginCount||0});}
    return json(200,{items:all.slice((page-1)*pageSize,page*pageSize),total:all.length,page,pageSize});
  }

  async function adminUserAction(req, username, action) {
    const auth=await requireAdmin(req,"Admin");if(auth.error)return auth.error;const key=`parents/${safeKey(username)}.json`,user=await storage.get(key);if(!user)return json(404,{error:"用户不存在"});
    if(action==="delete") return json(409,{error:"为保留学习和审计记录，账号请先冻结；物理删除需执行数据保留流程"});
    const before={status:user.status};user.status=action==="freeze"?"frozen":"active";user.updatedAt=nowIso();await storage.put(key,user);await audit(auth.admin,action,"user",username,before,{status:user.status},req);return json(200,{ok:true,status:user.status});
  }

  async function adminRedeemList(req) {
    const auth=await requireAdmin(req);if(auth.error)return auth.error;const params=new URL(req.url||"/","http://local").searchParams,page=Math.max(1,Number(params.get("page")||1)),pageSize=Math.min(100,Math.max(1,Number(params.get("pageSize")||20))),status=params.get("status");
    const keys=storage.list?await storage.list("redeem-codes/"):[],all=[];for(const key of keys){const item=await storage.get(key);if(item){const current=item.revokedAt?"revoked":item.redeemedAt?"used":(item.expiresAt&&Date.parse(item.expiresAt)<Date.now()?"expired":"unused");if(!status||status===current)all.push({...item,status:current});}}
    return json(200,{items:all.slice((page-1)*pageSize,page*pageSize),total:all.length,page,pageSize});
  }

  async function revokeRedeem(req) {
    const auth=await requireAdmin(req,"Operator");if(auth.error)return auth.error;const body=parseBody(req),code=String(body.code||"").trim().toUpperCase(),key=`redeem-codes/${safeKey(code)}.json`,item=await storage.get(key);if(!item)return json(404,{error:"兑换码不存在"});if(item.redeemedAt)return json(409,{error:"已使用兑换码不能作废"});const updated={...item,revokedAt:nowIso(),revokedBy:auth.admin.id};await storage.put(key,updated);await audit(auth.admin,"revoke_redeem_code","redeem_code",code,item,updated,req);return json(200,{ok:true});
  }

  async function adminPlans(req){const auth=await requireAdmin(req);if(auth.error)return auth.error;return json(200,{plans:DEFAULT_PLANS});}

  async function adminOrders(req) {
    const auth=await requireAdmin(req);if(auth.error)return auth.error;
    const keys=storage.list?await storage.list("orders/"):[],items=[];
    for(const key of keys){const item=await storage.get(key);if(item)items.push(item);}
    return json(200,{items:items.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))});
  }

  async function createAdminOrder(req) {
    const auth=await requireAdmin(req,"Operator");if(auth.error)return auth.error;
    const body=parseBody(req),item=planInfo(body.plan);
    if(!item)return json(400,{error:"请选择月卡、季卡或年卡"});
    const order={id:`manual-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,type:"manual",status:"paid_pending_code",plan:item.plan,label:item.label,fee:item.fee,amount:String(body.amount||"").slice(0,20),buyer:String(body.buyer||"").slice(0,80),note:String(body.note||"").slice(0,120),createdAt:nowIso(),createdBy:auth.admin.id};
    await storage.put(`orders/${order.id}.json`,order);await audit(auth.admin,"create_manual_order","order",order.id,null,order,req);
    return json(200,{order});
  }

  async function adminLogs(req){const auth=await requireAdmin(req);if(auth.error)return auth.error;const keys=storage.list?await storage.list("admin-logs/"):[],items=[];for(const key of keys.slice(-100))items.push(await storage.get(key));return json(200,{items:items.filter(Boolean).reverse()});}

  async function exportAdminBackup(req) {
    const auth = await requireAdmin(req, "SuperAdmin");
    if(auth.error) return auth.error;
    if(!storage.list) return json(503, {error: "当前存储不支持完整备份"});

    await audit(auth.admin, "export_backup", "backup", "full", null, {scope: "all"}, req);
    const keys = (await storage.list("")).filter(key => key.endsWith(".json")).sort();
    const objects = [];
    for(const key of keys) {
      const value = await storage.get(key);
      if(value !== null) objects.push({key, value});
    }
    return json(200, {
      format: "xueba-backup-v1",
      exportedAt: nowIso(),
      objectCount: objects.length,
      objects
    });
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
    if(generated && generated.revokedAt) return json(409,{error:"这个兑换码已作废。"});
    if(generated && generated.expiresAt && Date.parse(generated.expiresAt)<Date.now()) return json(409,{error:"这个兑换码已过期。"});
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
    const auth=await requireAdmin(req,"Operator");
    if(auth.error){
      if(!adminPassword || String(body.adminPassword||"")!==adminPassword) return auth.error;
    }
    const item = planInfo(body.plan);
    if(!item) return json(400, {error: "请选择月卡、季卡或年卡"});
    const quantity = Math.max(1, Math.min(1000, Number(body.quantity) || 1));
    const note = String(body.note || "").trim().slice(0, 80);
    const batchId=`batch-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const codes = [];
    for(let i = 0; i < quantity; i++) {
      let code = "";
      for(let tries = 0; tries < 5; tries++) {
        code = makeRedeemCode(item.plan);
        if(!(await storage.get(`redeem-codes/${safeKey(code)}.json`))) break;
      }
      const record = {id:crypto.randomUUID(),code,batchId,type:"membership",value:item.days,status:"unused",...item,note,source:String(body.source||"manual").slice(0,40),orderReference:String(body.orderReference||"").slice(0,80),createdAt: nowIso(),redeemedAt: "", owner: "",createdBy:auth.admin?.id||"legacy"};
      await storage.put(`redeem-codes/${safeKey(code)}.json`, record);
      codes.push(record);
    }
    if(auth.admin) await audit(auth.admin,"generate_redeem_codes","redeem_batch",batchId,null,{quantity,codes:codes.length,plan:item.plan,note},req);
    return json(200, {batchId,codes});
  }

  async function handle(req) {
    if(req.method === "OPTIONS") return json(204, {});
    const path = req.path || new URL(req.url || "http://local/").pathname;
    if(path === "/" || path === "/health") return json(200, {ok: true, storage: "oss", node: process.version, tokenSecretSet: tokenSecret !== "change-me"});
    if(path === "/api/register" && req.method === "POST") return register(req);
    if(path === "/api/login" && req.method === "POST") return login(req);
    if(path === "/api/password/reset" && req.method === "POST") return resetPassword(req);
    if(path === "/api/admin/login" && req.method === "POST") return adminLogin(req);
    if(path === "/api/admin/dashboard" && req.method === "GET") return adminDashboard(req);
    if(path === "/api/admin/users" && req.method === "GET") return listAdminUsers(req);
    if(path.startsWith("/api/admin/users/") && req.method === "POST") return adminUserAction(req,path.split("/")[4],parseBody(req).action||"freeze");
    if(path === "/api/admin/redeem-codes" && req.method === "GET") return adminRedeemList(req);
    if(path === "/api/children" && (req.method === "GET" || req.method === "PUT")) return children(req);
    if(path === "/api/progress" && (req.method === "GET" || req.method === "PUT")) return progress(req);
    if(path === "/api/membership" && req.method === "GET") return membership(req);
    if(path === "/api/membership/redeem" && req.method === "POST") return redeem(req);
    if(path === "/api/admin/redeem-codes" && req.method === "POST") return generateRedeemCodes(req);
    if(path === "/api/admin/redeem-codes/revoke" && req.method === "POST") return revokeRedeem(req);
    if(path === "/api/admin/plans" && req.method === "GET") return adminPlans(req);
    if(path === "/api/admin/orders" && req.method === "GET") return adminOrders(req);
    if(path === "/api/admin/orders" && req.method === "POST") return createAdminOrder(req);
    if(path === "/api/admin/logs" && req.method === "GET") return adminLogs(req);
    if(path === "/api/admin/backup/export" && req.method === "GET") return exportAdminBackup(req);
    return json(404, {error: "no such route"});
  }

  return {handle};
}

module.exports = {createApp, DEFAULT_REDEEM_CODES};

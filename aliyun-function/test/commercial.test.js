const assert=require("node:assert/strict");const test=require("node:test");const crypto=require("node:crypto");const {createApp}=require("../src/app");
function storage(){const m=new Map();return {async get(k){return m.has(k)?JSON.parse(JSON.stringify(m.get(k))):null},async put(k,v){m.set(k,JSON.parse(JSON.stringify(v)))},async list(prefix=""){return [...m.keys()].filter(k=>k.startsWith(prefix)&&k.endsWith(".json"))}}}
function hash(password,salt){return crypto.pbkdf2Sync(password,salt,120000,32,"sha256").toString("hex")}
async function call(app,method,path,body,token){return app.handle({method,path:path.split("?")[0],url:path,headers:token?{authorization:`Bearer ${token}`}: {},query:{},body:body?JSON.stringify(body):""})}
test("server-side admin roles and commercial workflow",async()=>{
  const salt="test-salt",admin={id:"a1",username:"admin@example.com",role:"SuperAdmin",salt,passwordHash:hash("strong-pass",salt),enabled:true};
  const app=createApp({storage:storage(),tokenSecret:"user-secret",adminSecret:"admin-secret",adminUsers:[admin]});
  const login=await call(app,"POST","/api/admin/login",{username:admin.username,password:"strong-pass"});assert.equal(login.statusCode,200);const token=JSON.parse(login.body).token;
  assert.equal((await call(app,"POST","/api/admin/redeem-codes",{plan:"month",quantity:2,note:"manual-order"},token)).statusCode,200);
  const list=await call(app,"GET","/api/admin/redeem-codes?page=1&pageSize=10",null,token);assert.equal(JSON.parse(list.body).items.length,2);
  const users=await call(app,"GET","/api/admin/users?page=1&pageSize=10",null,token);assert.equal(users.statusCode,200);
  const logs=await call(app,"GET","/api/admin/logs",null,token);assert.ok(JSON.parse(logs.body).items.some(x=>x.action==="generate_redeem_codes"));
  const bad=await call(app,"POST","/api/admin/redeem-codes",{plan:"month",quantity:1},"not-an-admin-token");assert.equal(bad.statusCode,401);
  const failed=await call(app,"POST","/api/admin/login",{username:admin.username,password:"wrong-pass"});assert.equal(failed.statusCode,401);
  const logsAfterFailure=await call(app,"GET","/api/admin/logs",null,token);assert.ok(JSON.parse(logsAfterFailure.body).items.some(x=>x.action==="admin_login_failed"));
  const order=await call(app,"POST","/api/admin/orders",{plan:"quarter",buyer:"测试家长",amount:"99"},token);assert.equal(order.statusCode,200);
  assert.equal((await call(app,"GET","/api/admin/orders",null,token)).statusCode,200);
  assert.equal((await call(app,"GET","/api/admin/backup/export",null,"invalid")).statusCode,401);
  const backup=await call(app,"GET","/api/admin/backup/export",null,token);assert.equal(backup.statusCode,200);
  const backupBody=JSON.parse(backup.body);assert.equal(backupBody.format,"xueba-backup-v1");assert.equal(backupBody.objectCount,backupBody.objects.length);
  assert.ok(backupBody.objects.some(x=>x.key.startsWith("redeem-codes/")));
  assert.ok(backupBody.objects.some(x=>x.key.startsWith("admin-logs/")&&x.value.action==="export_backup"));
});

#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const {execFileSync} = require("node:child_process");

const MAGIC = Buffer.from("XUEBA_BACKUP_V1\n", "ascii");
const DEFAULT_API = "https://xueba-backend-uqcgxocmtf.cn-hangzhou.fcapp.run";
const DEFAULT_DIR = path.join(os.homedir(), "Documents", "小学霸云端备份");
const ADMIN_SERVICE = "com.geminizhu.xueba-backup.admin";
const KEY_SERVICE = "com.geminizhu.xueba-backup.encryption";
const ADMIN_ACCOUNT = process.env.XUEBA_ADMIN_USERNAME || "617705109@qq.com";

function keychainSecret(service, account) {
  return execFileSync("/usr/bin/security", ["find-generic-password", "-s", service, "-a", account, "-w"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
}

function deriveKey(passphrase, salt) {
  return crypto.scryptSync(passphrase, salt, 32, {N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024});
}

function encryptBackup(payload, passphrase) {
  const plain = Buffer.from(JSON.stringify(payload), "utf8");
  const compressed = zlib.gzipSync(plain, {level: 9});
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv);
  const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const header = {
    algorithm: "aes-256-gcm+scrypt+gzip",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    exportedAt: payload.exportedAt,
    objectCount: payload.objectCount,
    plainSha256: crypto.createHash("sha256").update(plain).digest("hex")
  };
  return Buffer.concat([MAGIC, Buffer.from(JSON.stringify(header) + "\n", "utf8"), ciphertext]);
}

function decryptBackup(buffer, passphrase) {
  if(!buffer.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("不是小学霸备份文件");
  const headerEnd = buffer.indexOf(10, MAGIC.length);
  if(headerEnd < 0) throw new Error("备份头损坏");
  const header = JSON.parse(buffer.subarray(MAGIC.length, headerEnd).toString("utf8"));
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    deriveKey(passphrase, Buffer.from(header.salt, "base64")),
    Buffer.from(header.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(header.tag, "base64"));
  const compressed = Buffer.concat([decipher.update(buffer.subarray(headerEnd + 1)), decipher.final()]);
  const plain = zlib.gunzipSync(compressed);
  const digest = crypto.createHash("sha256").update(plain).digest("hex");
  if(digest !== header.plainSha256) throw new Error("备份完整性校验失败");
  const payload = JSON.parse(plain.toString("utf8"));
  if(payload.format !== "xueba-backup-v1" || payload.objectCount !== payload.objects?.length) {
    throw new Error("备份数据结构校验失败");
  }
  return {header, payload};
}

async function requestJson(url, options = {}) {
  let lastError;
  for(let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(30000), ...options});
      const body = await response.json().catch(() => ({}));
      if(!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      return body;
    } catch(error) {
      lastError = error;
      if(attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
  throw lastError;
}

function safeTimestamp(iso) {
  return String(iso).replace(/[:.]/g, "-");
}

function listBackups(dir) {
  try {
    return fs.readdirSync(dir).filter(name => name.endsWith(".xbak")).sort().reverse();
  } catch(error) {
    if(error.code === "ENOENT") return [];
    throw error;
  }
}

function rotate(dir, keep) {
  for(const name of listBackups(dir).slice(keep)) fs.rmSync(path.join(dir, name));
}

function tierNeedsSnapshot(dir, exportedAt, period) {
  const latest = listBackups(dir)[0];
  if(!latest) return true;
  const latestDate = latest.slice("xueba-".length, "xueba-YYYY-MM-DD".length);
  const currentDate = exportedAt.slice(0, 10);
  if(period === "monthly") return latestDate.slice(0, 7) !== currentDate.slice(0, 7);
  return Date.parse(`${currentDate}T00:00:00Z`) - Date.parse(`${latestDate}T00:00:00Z`) >= 7 * 86400000;
}

function writeEncryptedSnapshot(root, encrypted, metadata) {
  const filename = `xueba-${safeTimestamp(metadata.exportedAt)}.xbak`;
  const dailyDir = path.join(root, "daily");
  const weeklyDir = path.join(root, "weekly");
  const monthlyDir = path.join(root, "monthly");
  for(const dir of [dailyDir, weeklyDir, monthlyDir]) fs.mkdirSync(dir, {recursive: true, mode: 0o700});

  const temp = path.join(dailyDir, `.${filename}.tmp`);
  const dailyFile = path.join(dailyDir, filename);
  fs.writeFileSync(temp, encrypted, {mode: 0o600});
  fs.renameSync(temp, dailyFile);
  if(tierNeedsSnapshot(weeklyDir, metadata.exportedAt, "weekly")) fs.copyFileSync(dailyFile, path.join(weeklyDir, filename));
  if(tierNeedsSnapshot(monthlyDir, metadata.exportedAt, "monthly")) fs.copyFileSync(dailyFile, path.join(monthlyDir, filename));
  rotate(dailyDir, 7);
  rotate(weeklyDir, 4);
  rotate(monthlyDir, 12);

  const encryptedSha256 = crypto.createHash("sha256").update(encrypted).digest("hex");
  const manifest = {
    format: "xueba-backup-manifest-v1",
    latest: `daily/${filename}`,
    exportedAt: metadata.exportedAt,
    objectCount: metadata.objectCount,
    bytes: encrypted.length,
    sha256: encryptedSha256,
    retention: {daily: 7, weekly: 4, monthly: 12}
  };
  fs.writeFileSync(path.join(root, "latest.json"), JSON.stringify(manifest, null, 2) + "\n", {mode: 0o600});
  return {dailyFile, manifest};
}

async function createBackup() {
  const api = (process.env.XUEBA_BACKUP_API || DEFAULT_API).replace(/\/$/, "");
  const root = process.env.XUEBA_BACKUP_DIR || DEFAULT_DIR;
  const adminPassword = keychainSecret(ADMIN_SERVICE, ADMIN_ACCOUNT);
  const passphrase = keychainSecret(KEY_SERVICE, ADMIN_ACCOUNT);
  const login = await requestJson(`${api}/api/admin/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({username: ADMIN_ACCOUNT, password: adminPassword})
  });
  const payload = await requestJson(`${api}/api/admin/backup/export`, {
    headers: {Authorization: `Bearer ${login.token}`}
  });
  const encrypted = encryptBackup(payload, passphrase);
  const verified = decryptBackup(encrypted, passphrase);
  const result = writeEncryptedSnapshot(root, encrypted, verified.payload);
  console.log(JSON.stringify({ok: true, file: result.dailyFile, ...result.manifest}));
}

function selfTest() {
  const payload = {format: "xueba-backup-v1", exportedAt: new Date().toISOString(), objectCount: 1, objects: [{key: "test.json", value: {ok: true}}]};
  const encrypted = encryptBackup(payload, "self-test-passphrase");
  const restored = decryptBackup(encrypted, "self-test-passphrase");
  if(restored.payload.objects[0].value.ok !== true) throw new Error("自检失败");
  console.log(JSON.stringify({ok: true, selfTest: true, bytes: encrypted.length}));
}

if(require.main === module) {
  const command = process.argv[2] || "backup";
  if(command === "--self-test") selfTest();
  else if(command === "--verify") {
    const file = process.argv[3];
    if(!file) throw new Error("请提供 .xbak 文件路径");
    const passphrase = keychainSecret(KEY_SERVICE, ADMIN_ACCOUNT);
    const verified = decryptBackup(fs.readFileSync(file), passphrase);
    console.log(JSON.stringify({ok: true, exportedAt: verified.payload.exportedAt, objectCount: verified.payload.objectCount}));
  } else createBackup().catch(error => { console.error(`[xueba-backup] ${error.message}`); process.exitCode = 1; });
}

module.exports = {encryptBackup, decryptBackup, writeEncryptedSnapshot};

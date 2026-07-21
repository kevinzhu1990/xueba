const OSS = require("ali-oss");
const fs = require("node:fs");
const path = require("node:path");
const {createApp} = require("./app");

function fileStorage() {
  const baseDir = process.env.LOCAL_DATA_DIR || "/tmp/xueba-cloud-data";
  return {
    async get(key) {
      try {
        const file = path.join(baseDir, key);
        return JSON.parse(await fs.promises.readFile(file, "utf8"));
      } catch(e) {
        if(e && e.code === "ENOENT") return null;
        throw e;
      }
    },
    async put(key, value) {
      const file = path.join(baseDir, key);
      await fs.promises.mkdir(path.dirname(file), {recursive: true});
      await fs.promises.writeFile(file, JSON.stringify(value), "utf8");
    },
    async list(prefix="") {
      const root = path.join(baseDir, prefix);
      const out=[];
      async function walk(dir){
        let entries=[];try{entries=await fs.promises.readdir(dir,{withFileTypes:true});}catch(e){if(e.code==="ENOENT")return;throw e;}
        for(const entry of entries){const full=path.join(dir,entry.name);if(entry.isDirectory())await walk(full);else if(entry.name.endsWith(".json"))out.push(path.relative(baseDir,full).replaceAll(path.sep,"/"));}
      }
      await walk(root);return out;
    }
  };
}

function ossStorage() {
  const bucket = process.env.OSS_BUCKET || process.env.OSS_BUCKET_NAME;
  const region = process.env.OSS_REGION || process.env.ALIYUN_REGION || process.env.ALIBABA_CLOUD_REGION || "oss-cn-hangzhou";
  const prefix = (process.env.OSS_PREFIX || "xueba/").replace(/^\/+/, "").replace(/\/?$/, "/");
  if(!bucket) {
    console.warn("OSS_BUCKET is not set, falling back to /tmp storage");
    return fileStorage();
  }
  const cfg = {
    region,
    bucket,
    accessKeyId: process.env.OSS_AK_ID || process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_AK_SECRET || process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    stsToken: process.env.OSS_STS_TOKEN || process.env.ALIBABA_CLOUD_SECURITY_TOKEN
  };
  Object.keys(cfg).forEach(k => cfg[k] == null && delete cfg[k]);
  const client = new OSS(cfg);
  return {
    async get(key) {
      try {
        const result = await client.get(prefix + key);
        const text = Buffer.isBuffer(result.content) ? result.content.toString("utf8") : String(result.content || "");
        return text ? JSON.parse(text) : null;
      } catch(e) {
        if(e && (e.code === "NoSuchKey" || e.status === 404)) return null;
        throw e;
      }
    },
    async put(key, value) {
      await client.put(prefix + key, Buffer.from(JSON.stringify(value), "utf8"), {
        headers: {"Content-Type": "application/json; charset=utf-8"}
      });
    },
    async list(prefixKey="") {
      const names=[];
      let marker;
      do {
        const result=await client.list({prefix:prefix+prefixKey,delimiter:"",marker,"max-keys":1000});
        names.push(...(result.objects||[]).map(item=>String(item.name).slice(prefix.length)));
        marker=result.isTruncated ? result.nextMarker : undefined;
      } while(marker);
      return names;
    }
  };
}

if(!process.env.TOKEN_SECRET || process.env.TOKEN_SECRET === "change-me") {
  throw new Error("TOKEN_SECRET must be configured and must not use the default value");
}

const app = createApp({
  storage: ossStorage(),
  tokenSecret: process.env.TOKEN_SECRET
});

const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(__dirname, "..", "public");
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};
const STATIC_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://xueba-backend-uqcgxocmtf.cn-hangzhou.fcapp.run https://cloudflareinsights.com; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
};

function safePublicPath(urlPath) {
  const cleanPath = decodeURIComponent(String(urlPath || "/").split("?")[0]);
  const relative = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const resolved = path.resolve(PUBLIC_DIR, relative);
  const root = path.resolve(PUBLIC_DIR);
  if(resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

async function staticResponse(urlPath) {
  if(String(urlPath || "/").startsWith("/api/") || urlPath === "/health") return null;
  const file = safePublicPath(urlPath);
  if(!file) return null;
  try {
    const body = await fs.promises.readFile(file, "utf8");
    const ext = path.extname(file).toLowerCase();
    return {
      statusCode: 200,
      headers: {
        ...STATIC_SECURITY_HEADERS,
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=14400"
      },
      body
    };
  } catch(e) {
    if(e && e.code !== "ENOENT") throw e;
    if(urlPath !== "/") {
      try {
        const body = await fs.promises.readFile(path.join(PUBLIC_DIR, "index.html"), "utf8");
        return {
          statusCode: 200,
          headers: {...STATIC_SECURITY_HEADERS, "Content-Type": MIME_TYPES[".html"], "Cache-Control": "no-store"},
          body
        };
      } catch(inner) {
        if(inner && inner.code !== "ENOENT") throw inner;
      }
    }
    return null;
  }
}

function readBody(req) {
  if(req.body != null) {
    return Promise.resolve(Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body));
  }
  if(!req.on) return Promise.resolve("");
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function requestFromEvent(event) {
  let parsed = event;
  if(Buffer.isBuffer(parsed)) parsed = parsed.toString("utf8");
  if(typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch(e) { parsed = {body: parsed}; }
  }
  parsed = parsed || {};
  const rawPath = parsed.path || parsed.rawPath || parsed.requestContext?.http?.path || "/";
  const method = parsed.method || parsed.httpMethod || parsed.requestContext?.http?.method || "GET";
  const query = parsed.queryParameters || parsed.queryStringParameters || {};
  const qs = new URLSearchParams(query).toString();
  const body = parsed.isBase64Encoded ? Buffer.from(parsed.body || "", "base64").toString("utf8") : (parsed.body || "");
  return {
    method,
    url: qs ? `${rawPath}?${qs}` : rawPath,
    path: rawPath,
    query,
    headers: parsed.headers || {},
    body
  };
}

function sendHttpResponse(resp, result) {
  Object.entries(result.headers || {}).forEach(([k, v]) => resp.setHeader(k, v));
  resp.setStatusCode(result.statusCode || 200);
  resp.send(result.body || "");
}

function eventResponse(result) {
  return {
    statusCode: result.statusCode || 200,
    headers: result.headers || {},
    body: result.body || "",
    isBase64Encoded: false
  };
}

exports.handler = async function(req, resp) {
  try {
    if(resp && typeof resp.setHeader === "function" && typeof resp.send === "function") {
      const reqPath = req.path || new URL(req.url || "/", "http://local").pathname;
      const staticResult = await staticResponse(reqPath);
      if(staticResult) return sendHttpResponse(resp, staticResult);
      const body = await readBody(req);
      const url = req.url || req.path || "/";
      return sendHttpResponse(resp, await app.handle({
        method: req.method,
        url,
        path: req.path || new URL(url, "http://local").pathname,
        query: req.queries || Object.fromEntries(new URL(url, "http://local").searchParams.entries()),
        headers: req.headers || {},
        body
      }));
    }
    const eventReq = requestFromEvent(req);
    const staticResult = await staticResponse(eventReq.path);
    if(staticResult) return eventResponse(staticResult);
    return eventResponse(await app.handle(eventReq));
  } catch(e) {
    const result = {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({error: e.message || "server error"})
    };
    if(resp && typeof resp.setHeader === "function" && typeof resp.send === "function") {
      return sendHttpResponse(resp, result);
    }
    return eventResponse(result);
  }
};

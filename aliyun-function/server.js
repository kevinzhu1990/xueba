const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const OSS = require("ali-oss");
const {createApp} = require("./src/app");

const PORT = process.env.PORT || process.env.FC_SERVER_PORT || 9000;

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
    }
  };
}

const app = createApp({
  storage: ossStorage(),
  tokenSecret: process.env.TOKEN_SECRET
});

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

async function runHttp(req) {
  const body = await readBody(req);
  const url = req.url || req.path || "/";
  return app.handle({
    method: req.method,
    url,
    path: req.path || new URL(url, "http://local").pathname,
    query: req.queries || Object.fromEntries(new URL(url, "http://local").searchParams.entries()),
    headers: req.headers || {},
    body
  });
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
      return sendHttpResponse(resp, await runHttp(req));
    }
    return eventResponse(await app.handle(requestFromEvent(req)));
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

if(require.main === module) {
  http.createServer(async (req, res) => {
    try {
      const result = await runHttp(req);
      Object.entries(result.headers || {}).forEach(([k, v]) => res.setHeader(k, v));
      res.statusCode = result.statusCode || 200;
      res.end(result.body || "");
    } catch(e) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.statusCode = 500;
      res.end(JSON.stringify({error: e.message || "server error"}));
    }
  }).listen(PORT, () => {
    console.log(`xueba backend listening on ${PORT}`);
  });
}

const OSS = require("ali-oss");
const {createApp} = require("./app");

function ossStorage() {
  const bucket = process.env.OSS_BUCKET;
  const region = process.env.OSS_REGION || process.env.ALIYUN_REGION || "oss-cn-hangzhou";
  const prefix = (process.env.OSS_PREFIX || "xueba/").replace(/^\/+/, "").replace(/\/?$/, "/");
  if(!bucket) throw new Error("OSS_BUCKET is required");
  const client = new OSS({region, bucket});
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
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

exports.handler = async function(req, resp) {
  try {
    const body = await readBody(req);
    const result = await app.handle({
      method: req.method,
      url: req.url,
      path: new URL(req.url, "http://local").pathname,
      query: Object.fromEntries(new URL(req.url, "http://local").searchParams.entries()),
      headers: req.headers || {},
      body
    });
    Object.entries(result.headers || {}).forEach(([k, v]) => resp.setHeader(k, v));
    resp.setStatusCode(result.statusCode || 200);
    resp.send(result.body || "");
  } catch(e) {
    resp.setHeader("Content-Type", "application/json; charset=utf-8");
    resp.setHeader("Access-Control-Allow-Origin", "*");
    resp.setStatusCode(500);
    resp.send(JSON.stringify({error: e.message || "server error"}));
  }
};

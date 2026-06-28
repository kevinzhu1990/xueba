# 小学霸阿里云函数

这是 `https://xueba-backend-uqcgxocmtf.cn-hangzhou.fcapp.run` 后端的可部署源码版本。

## 接口

- `GET /health`
- `POST /api/register`
- `POST /api/login`
- `GET /api/children`
- `PUT /api/children`
- `GET /api/progress?child=...`
- `PUT /api/progress`
- `GET /api/membership`
- `POST /api/membership/redeem`

## 兑换码

- 月卡：`YUEKA2026`、`XUEBA-MONTH-2026`
- 季卡：`JIKA2026`、`XUEBA-QUARTER-2026`
- 年卡：`NIANKA2026`、`XUEBA-YEAR-2026`

同一个家长账号下，同一个兑换码只能兑换一次。多张不同兑换码会按当前有效期继续叠加。

## 环境变量

- `OSS_BUCKET`：存储账号、孩子档案、学习记录、会员状态的 OSS bucket
- `OSS_REGION`：默认 `oss-cn-hangzhou`
- `OSS_PREFIX`：默认 `xueba/`
- `TOKEN_SECRET`：JWT/HMAC token 密钥，必须设置为足够长的随机字符串
- `REDEEM_CODES_JSON`：可选，用 JSON 覆盖默认兑换码表

## 本地测试

```bash
npm install
npm test
```

## 部署提示

当前机器没有检测到可用的阿里云 CLI 或 Serverless Devs 登录配置，不能直接安全更新线上函数。
登录后可以用阿里云函数计算控制台上传本目录，入口为：

```text
src/index.handler
```

运行时使用 Node.js 20，部署前在函数环境变量里配置上面的 `OSS_BUCKET`、`OSS_REGION`、`TOKEN_SECRET`。

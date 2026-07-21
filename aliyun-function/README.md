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
- `POST /api/admin/login`
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `POST /api/admin/users/:id`
- `POST /api/admin/password-reset/:username`
- `GET/POST /api/admin/redeem-codes`
- `POST /api/admin/redeem-codes/revoke`
- `GET /api/admin/orders`
- `POST /api/admin/orders`
- `GET /api/admin/plans`
- `GET /api/admin/logs`

## 兑换码和密码重置

兑换码只能由运营后台动态生成，网站和源码不内置公开兑换码。同一个兑换码全局只能使用一次，多张不同兑换码会按当前有效期继续叠加。

密码重置码只能由管理员在用户管理页生成，有效期 15 分钟且只能使用一次。不要设置公开或长期通用的重置码。

## 环境变量

- `OSS_BUCKET`：存储账号、孩子档案、学习记录、会员状态的 OSS bucket
- `OSS_REGION`：默认 `oss-cn-hangzhou`
- `OSS_PREFIX`：默认 `xueba/`
- `TOKEN_SECRET`：JWT/HMAC token 密钥，必须设置为足够长的随机字符串
- `ADMIN_JWT_SECRET`：管理员会话密钥，必须与用户会话密钥分开
- `ADMIN_USERS_JSON`：管理员账号数组，使用 `node scripts/create-admin-credential.js` 生成单个账号后再放入 JSON 数组
- `REDEEM_CODES_JSON`：仅用于迁移旧兑换码；新兑换码统一从运营后台生成

## 本地测试

```bash
npm install
npm test
```

## 部署提示

当前函数需要在阿里云函数计算控制台上传本目录的 ZIP 并发布新版本，入口为：

```text
index.handler
```

运行时使用 Node.js 20。部署前在函数环境变量里配置上面的 `OSS_BUCKET`、`OSS_REGION`、`TOKEN_SECRET`、`ADMIN_JWT_SECRET` 和 `ADMIN_USERS_JSON`。

静态文件入口为 `public/index.html`，独立管理员入口为 `public/admin.html`。上传后需点击“部署代码/发布版本”，然后验证 `GET /health`、`GET /admin.html` 和 `POST /api/admin/login`。

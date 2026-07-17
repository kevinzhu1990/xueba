# 小学霸商业化第一阶段

## 实际架构

当前采用：GitHub Pages/阿里云函数静态前端 + 阿里云函数 Node.js 20 API + OSS JSON 服务端存储。现有家长、孩子、学习记录和会员数据继续使用原 OSS 路径，不迁移、不删除。当前没有 Supabase 项目凭据，因此没有把 Supabase 配置假写进前端；后续若接入 Supabase，应通过迁移脚本和双写校验切换。

## 后台入口

部署后访问 `/admin.html`，例如 `https://geminizhu.top/admin.html`。

管理员账号不写在前端。先在本地生成凭据：

```bash
node scripts/create-admin-credential.js admin@example.com SuperAdmin '请使用长随机密码'
```

把输出的 JSON 整体作为阿里云函数环境变量 `ADMIN_USERS_JSON`，并配置：

```text
ADMIN_JWT_SECRET=至少32位随机字符串
TOKEN_SECRET=至少32位随机字符串
OSS_BUCKET=现有OSS桶
OSS_REGION=oss-cn-hangzhou
OSS_PREFIX=xueba/
```

不要把真实值提交到 GitHub。`SuperAdmin`、`Admin`、`Operator` 由服务端判断，前端隐藏按钮不构成权限控制。

## 第一阶段流程

管理员登录后台，进入“兑换码管理”，选择月卡/季卡/年卡和数量，生成批次；生成记录写入 `redeem-codes/*.json`，兑换后写入会员和 `redeems/*.json`。已使用兑换码不能删除，未使用兑换码只能作废。管理员登录、生成、作废、冻结、恢复等动作写入 `admin-logs/*.json`。

## 主要接口

```text
POST /api/admin/login
GET  /api/admin/dashboard
GET  /api/admin/users?page=1&pageSize=20&search=
POST /api/admin/users/:id       {action:"freeze"|"restore"}
GET  /api/admin/redeem-codes?page=1&pageSize=20&status=unused
POST /api/admin/redeem-codes   {plan,quantity,note,source,orderReference}
POST /api/admin/redeem-codes/revoke {code}
GET  /api/admin/plans
GET  /api/admin/logs
POST /api/membership/redeem    {code}  (家长登录令牌)
```

订单、商品、支付回调的表和接口尚未接入真实支付。后续应先创建订单，再在支付回调经过幂等校验后发放会员权益，不能由前端直接改会员。

## 数据迁移原则

前端仍保留 localStorage 原始备份。用户登录后再上传合并，上传失败不清除本地记录。后台不读取明文密码，不展示完整 IP。现有 OSS 数据路径保持不变。

## 回滚

阿里云函数先发布为新版本并验证 `/health`、登录、兑换和 `/admin.html`，确认无误后再切换 LATEST；出错时切回上一函数版本。不要删除 OSS 原始对象。

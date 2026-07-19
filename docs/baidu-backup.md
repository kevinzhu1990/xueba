# 小学霸百度网盘备份

## 备份链路

1. 本机定时任务使用管理员账号登录阿里云函数。
2. 仅 `SuperAdmin` 可调用 `/api/admin/backup/export`。
3. 数据只在内存中转换，不落明文 JSON。
4. 使用 `AES-256-GCM + scrypt + gzip` 生成 `.xbak` 文件。
5. 百度网盘客户端只备份 `~/Documents/小学霸云端备份` 中的加密文件。

## 保留策略

- 每日：7 份
- 每周：4 份
- 每月：12 份

## 本机密钥

管理员密码和备份恢复密钥分别保存在 macOS 钥匙串：

- `com.geminizhu.xueba-backup.admin`
- `com.geminizhu.xueba-backup.encryption`

密钥不会写入仓库、LaunchAgent、日志或百度网盘。

## 验证备份

```bash
node scripts/xueba-cloud-backup.js --verify "$HOME/Documents/小学霸云端备份/daily/文件名.xbak"
```

验证过程只在内存中解密并检查格式、对象数量和 SHA-256，不会写出明文数据。

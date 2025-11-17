# 此目录用于存放各平台的私密凭证文件，不要提交到 Git。

- `google-service-account.json`：Google Play API 服务账号 JSON，用于 `eas submit --platform android`
- 其他可能的证书（如 `.p8`、`.p12`、`.keystore` 等）也可临时放置在这里，提交前务必删除

所有敏感数据请配合 `eas secret:create` 或 CI 密钥管理使用，避免保存在仓库中。


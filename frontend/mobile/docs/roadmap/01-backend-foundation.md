# 后端与基础设施工作包

## 目标
搭建可承载商业化的后端基础能力（账号、数据、计费、安全），为客户端提供统一 API，支持多设备同步与可控成本。

## 范围
- 服务端架构与部署（自建或 BaaS）
- 核心数据模型与 API
- 密钥与配置管理
- 日志、审计与基础监控
- 数据迁移与版本兼容

## 产出物
- 后端架构方案 + 成本估算
- 数据模型文档（含权限/索引/保留策略）
- API 规范文档（含错误码与限流策略）
- 环境与部署规范（dev/staging/prod）
- 安全基线清单（密钥、权限、风控）

## 架构选型（建议）
- 方案 A（快速落地）：BaaS + 自建 AI 网关
  - 数据：Supabase / Firebase + Postgres
  - 业务 API：Edge Functions 或 Serverless
  - 优势：开发快、运维轻
  - 风险：复杂自定义逻辑受限、成本波动
- 方案 B（可控与扩展）：自建 API + 托管数据库
  - 数据：Postgres + Redis
  - 业务 API：Node/Go + K8s/VM
  - 优势：可控性强
  - 风险：投入更大、运维成本高

## 中国上架推荐架构（阿里云 Supabase + 自建后端）
- 目标：数据留在境内、成本可控、合规可审计、对接国内支付/审核/推送
- 推荐组合：
  - Supabase（阿里云）：Auth + Postgres + Storage + Realtime
  - 自建后端（阿里云 ECS/SAE/函数计算）：AI 网关、计费、支付验票、内容审核、推送

### 逻辑结构
```
App
 |-- Supabase Auth/DB/Storage (RLS)
 |-- Backend API (AI 代理 / 支付验票 / 风控 / 推送)
      |-- DashScope/Qwen
      |-- 内容安全（阿里云内容安全）
      |-- IAP 票据校验 / 权益
```

### 服务映射（建议）
- Supabase
  - Auth：邮箱/短信验证码（对接阿里云短信）
  - Postgres：用户/会话/消息/词库/钱包流水
  - Storage：头像/图片/音频
  - Realtime：聊天实时更新
- 自建后端
  - AI 网关：统一调用 Qwen/TTS，限额/计费/风控
  - 订单&权益：IAP 票据校验、订阅状态、钱包记账
  - 内容安全：输入/输出审核、举报处理
  - 推送：APNs + 国内安卓厂商通道

### 合规要点（中国）
- 数据必须落地境内机房
- 域名/服务需备案（ICP / App 备案）
- 用户数据与日志可审计，可导出/删除
- 接入内容安全与未成年人保护

## 数据模型草案（最小可用）
- users
  - id, email, password_hash, status, created_at
- user_profiles
  - user_id, nickname, gender, mbti, zodiac, birthday
- devices
  - id, user_id, platform, push_token, last_seen_at
- roles
  - id, name, persona, avatar_url, tags, status
- conversations
  - id, user_id, role_id, title, updated_at
- messages
  - id, conversation_id, sender, body, kind, media_url, created_at
- vocab_items
  - id, user_id, term, definition, tags, srs_state, updated_at
- wallet_ledger
  - id, user_id, type, amount, balance_after, source, created_at
- purchases
  - id, user_id, store, receipt_id, status, expires_at

## API 规范（最小闭环）
- Auth
  - POST /auth/register
  - POST /auth/login
  - POST /auth/refresh
  - POST /auth/password/reset
- Profile
  - GET /me
  - PATCH /me
- Roles
  - GET /roles
  - GET /roles/:id
- Conversations
  - GET /conversations
  - POST /conversations
  - GET /conversations/:id/messages
  - POST /conversations/:id/messages
- Wallet/Entitlements
  - GET /wallet
  - POST /wallet/consume
  - POST /purchases/verify
- Sync
  - POST /sync/pull
  - POST /sync/push

## 安全与合规基线
- 密钥不下发客户端，所有第三方模型走服务端代理
- JWT/Session 过期与刷新策略
- 登录限流与异常登录告警
- 数据分区与权限隔离（按 user_id）
- PII 加密存储（邮箱、敏感字段）
- 审计日志（登录、支付、敏感操作）

## 部署与环境
- dev / staging / prod 三环境隔离
- CI/CD 自动化（构建、测试、部署）
- Secrets 管理（KMS 或 CI Secret）
- 监控：错误率、延迟、QPS、成本

## 数据迁移与兼容
- 本地 SQLite -> 云端：增量同步策略
- 客户端版本兼容：API 版本化与灰度
- 回滚策略：数据库迁移可回退

## 待完善清单
- [ ] 选择后端方案与部署区域（含成本评估）
- [ ] 设计数据模型：用户、设备、角色、会话、消息、词库、钱包流水、订单/票据
- [ ] 统一 API 规范（REST/GraphQL）与错误码
- [ ] 服务端环境配置（dev/staging/prod）
- [ ] 日志、限流、审计与告警
- [ ] 数据迁移方案（本地 -> 云端）
- [ ] 安全基线与权限策略落地
- [ ] 备案与合规材料准备（ICP / App 备案）

## 待完善清单
- [ ] 选择后端方案与部署区域（含成本评估）
- [ ] 设计数据模型：用户、设备、角色、会话、消息、词库、钱包流水、订单/票据
- [ ] 统一 API 规范（REST/GraphQL）与错误码
- [ ] 服务端环境配置（dev/staging/prod）
- [ ] 日志、限流、审计与告警

## 关键接口/数据（待补充）
- Users: id, email, status, created_at
- Sessions: access/refresh token, device binding
- Roles: role profiles, assets, status
- Conversations & Messages: chat history, metadata
- WalletLedger: credits/debits, source, balance
- Purchases & Entitlements: IAP receipts, active plan
- NotificationTokens: device push tokens

## 验收标准
- 核心 API 可跑通端到端流程（注册 -> 登录 -> 拉取角色 -> 发送消息）
- 服务端能独立控制密钥与成本
- 具备基础监控与错误告警
- 可支持多设备同步与安全退出

## 开放问题（需要确认）
- 账号体系：仅邮箱还是增加手机号/第三方登录？
- 商业模式：订阅为主还是心动币为主？
- 自建后端或 BaaS？需要的 SLA 与预算范围？

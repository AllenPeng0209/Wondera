# Dreamate 技术方案

## 1. 架构概览
```
Expo (React Native)
 ├─ UI 层：角色列表 / 对话窗口 / 记忆库 / 商城
 ├─ Expo Modules：Notifications、AV、FileSystem、SecureStore
 ├─ 数据层：SQLite/WatermelonDB（离线优先）
 └─ Service Worker：数据同步、消息队列

云服务
 ├─ 会话 API（LLM 推理）
 ├─ 收据校验 / 支付网关
 ├─ 遥测与崩溃日志（Sentry）
 └─ 配置中心（实验参数、广告水位）
```
重点：所有对话历史、记忆、角色设定、任务数据均存储在本地 DB，云端仅在需要生成回复、同步会员权益、上报分析时参与。

## 2. 技术栈
| 层级 | 技术 | 说明 |
| --- | --- | --- |
| 跨平台框架 | Expo SDK 52+ | 一次构建 iOS/Android，便于利用 Notifications、AV 等能力。 |
| 语言 | TypeScript | 统一前端逻辑、减少隐式类型错误。 |
| UI | React Native Paper / Reanimated | 满足多端一致性与动效需求。 |
| 状态管理 | Zustand + React Query | Zustand 管临时 UI 状态，React Query 管 API 调用与缓存。 |
| 本地数据库 | WatermelonDB（SQLite 驱动） | 提供观察者模式、冲突解决钩子、与 Expo 兼容。 |
| 同步层 | Custom Sync Engine | 在网络可用时将本地差异打包发送至云；云端返回最新会话摘要。 |
| 推送/提醒 | Expo Notifications + 本地调度 | 触发早晚问候、本地习惯任务。[^appstore] |
| 语音处理 | Expo AV + 云端 TTS/ASR | 语音输入上传至云做识别，结果回写本地。 |
| 崩溃监控 | Sentry Expo SDK | 参考 Lovemo 使用 Sentry 的做法。[^sdk] |
| 分析 | 神策/TalkingData RN SDK | 离线缓存事件，网络恢复时批量上报。[^sdk] |

## 3. 模块设计
### 3.1 对话模块
- 输入：文本（V1）、语音（V1.1）、图片（V2）。
- 过程：
  1. 先写入本地 DB 的 `messages` 表，状态为 `pending`。
  2. 若网络可用，发送到会话 API（遵守内容安全策略）。[^privacy]
  3. 返回结果后更新 `messages` 并触发记忆提取流程。
- 内容安全：在客户端进行基础敏感词过滤，云端再次审核，符合 Lovemo 协议约束。[^tos][^privacy]

### 3.2 记忆与回忆卡
- 本地 `memories` 表保存事件、情绪、关联角色。
- 记忆生成策略：
  - LLM 回复后，将摘要任务加入队列。
  - 摘要存储在本地并标记来源消息范围。
  - VIP 用户拥有更大 `memory_quota` 与“锁定记忆”能力。
- 回忆卡 feed 根据时间、情绪、主题分类，本地即可渲染。云端仅同步统计数。

### 3.3 角色系统
- `roles` 表字段：`id`、`name`、`avatar`, `persona`, `greeting_rules`, `relationship`, `memory_quota`。
- 角色模板存储在配置中心，客户端启动时写入本地缓存。
- 用户可在离线状态编辑角色设定，下一次同步时再推送。

### 3.4 任务与提醒
- `tasks` 表记录早安/晚安或自定义 ritual。
- Expo Notifications 安排本地触发；若用户禁用通知，则通过应用内提醒提示。
- 完成任务会触发奖励：记录在本地，待网络恢复后兑付虚拟币。

### 3.5 付费与权益
- iOS：使用 Expo In-App Purchases，商品包含虚拟币包与 VIP 月卡。[^appstore]
- Android：结合渠道支付（应用宝、小米）以及 Expo bare workflow 集成自定义支付模块。[^tencent][^xiaomi]
- 收据校验交由云端完成，并返回权益更新指令（如扩容记忆、增加角色槽）；客户端收到后更新本地 DB。

### 3.6 广告与 SDK
- 广告 SDK（腾讯优量汇、穿山甲、百度、AdBright）通过原生模块桥接，遵循《第三方 SDK 清单》披露要求。[^sdk]
- 所有广告请求需携带来自本地 DB 的匿名化设备指纹（OAID/IDFA 需获得授权）。[^privacy]

## 4. 数据模型（简化）
```
roles
- id (uuid)
- name / avatar / persona / tone
- relationship_type
- greeting_rules (json)
- memory_quota
- created_at / updated_at

messages
- id
- role_id
- direction ('user' | 'ai')
- content / attachments
- emotion_tag
- status ('pending'|'synced')
- created_at

memories
- id
- role_id
- title
- summary
- mood
- importance (0-3)
- source_message_ids
- locked (boolean)
- created_at

tasks
- id
- role_id
- type ('morning'|'night'|'custom')
- schedule (cron-like json)
- reward
- status

purchases
- id
- product_id
- platform ('ios'|'android')
- receipt
- status
- entitlement_payload
```

## 5. 同步策略
1. **差量同步**：
   - 每次成功调用云端 API 后，将 `synced_at` 写入本地。
   - 同步包包含 messages/memories/purchases 的增量。
2. **冲突解决**：
   - 以本地编辑为主；若云端也更新同一对象（如角色设定），使用版本号合并策略。
3. **离线保障**：
   - 所有写操作先落地本地 DB；
   - 网络恢复后后台任务（Expo Task Manager）自动触发同步。

## 6. 安全与合规
- **数据存储**：敏感字段（手机号、token）使用 Expo SecureStore 加密；对话内容在本地 DB 进行 AES 加密。
- **实名认证**：登录流程需手机号或第三方账号，符合 Lovemo 协议中对实名认证的要求。[^privacy]
- **权限管理**：摄像头、麦克风、存储、悬浮窗权限按需申请并可在设置页撤回。[^xiaomi]
- **儿童保护**：若用户确认年龄 < 18，默认关闭付费和广告；<14 需监护人同意。[^privacy]
- **用户权利**：提供导出/删除/注销接口，对应 Lovemo 协议承诺 15 个工作日内处理。[^privacy]

## 7. DevOps 与发布
- **CI/CD**：使用 Expo Application Services (EAS) + GitHub Actions；自动运行 TypeScript 检查、E2E 测试（Detox）。
- **崩溃监控**：Sentry 上报含设备信息、堆栈；根据 Lovemo 对稳定性的高需求，对 `crash_rate > 1%` 时触发告警。[^sdk]
- **多渠道打包**：
  - iOS：EAS Build -> App Store Connect。
  - Android：EAS Build 生成通用 AAB；使用渠道脚本拆分并注入应用宝/小米 SDK。[^tencent][^xiaomi]
- **配置管理**：Remote Config 存储在云端（如 Supabase/自建服务），包含模型 endpoint、广告开关、实验参数。

## 8. 迭代路线
| 阶段 | 能力 |
| --- | --- |
| V1.0 | 文本对话、角色模板、本地记忆、早晚问候、IAP。 |
| V1.1 | 语音输入、语音播报、情绪日记、VIP 记忆扩展。 |
| V1.2 | 图像输入、回忆卡 feed、激励任务、广告变现。 |
| V1.3 | Web 版本（Expo Router + web）、端到端加密备份。 |

## 9. 参考资料
[^appstore]: App Store - https://apps.apple.com/us/app/lovemo/id6751569435
[^tencent]: 腾讯应用宝 - https://sj.qq.com/appdetail/io.iftech.lovemo
[^xiaomi]: 小米应用商店 - https://r.app.xiaomi.com/details?id=io.iftech.lovemo
[^tos]: lovemo 软件许可及服务协议 - https://post.jellow.club/lovemoyonghu
[^privacy]: lovemo 隐私政策 - https://post.jellow.club/lovemoyinsi
[^sdk]: 第三方 SDK 清单 - https://post.jellow.club/uufriends-sdk-zh/

## AI 后台“拍一拍”推送（本地通知示例）

该实现展示了在 **不依赖自建后端** 的前提下，利用系统后台任务 + 本地通知，让 AI 在 App 退到后台后，偶尔主动发消息提醒用户。

### 关键模块

- `src/services/notifications.js`
  - 封装 `expo-notifications`：
    - `requestNotificationPermissions()`：请求通知权限。
    - `sendLocalKnockNotification({ conversationId, title, body })`：发送一条立即触发的本地通知，并在 `data` 里携带 `conversationId`。
- `src/background/aiKnockTask.js`
  - 使用 `expo-task-manager` + `expo-background-fetch` 定义后台任务：
    - 任务名：`dreamate-ai-knock-background-task`。
    - `registerAiKnockBackgroundTask()`：在应用启动时注册后台任务。
    - `runAiKnockOnce()`：单次执行逻辑：
      1. 调用 `getKnockableConversations()` 找出适合“拍一拍”的会话（允许 `allow_knock`、未拉黑、长时间未更新）。
      2. 取一个目标会话，使用 `getConversationDetail()` 和 `getMessages()` 拿到上下文。
      3. 复用现有的 `generateAiReply()` 生成一条 AI 回复（优先走 Qwen，失败时退回脚本）。
      4. 调用 `addMessage()` 写入本地 SQLite。
      5. 调用 `sendLocalKnockNotification()` 发送本地通知，文案形如「某某 想你了」。
- `src/storage/db.js`
  - 新增：
    - `getKnockableConversations(sinceMs)`：根据 `allow_knock`、`is_blocked`、`updated_at` 等条件筛选需要被“唤醒”的会话。

### App 启动时的注册

- 在 `App.js` 中：
  - 初始化数据库后，调用：
    - `requestNotificationPermissions()`：请求通知权限；
    - `registerAiKnockBackgroundTask()`：注册后台任务。
  - 这样在 iOS/Android 上，系统会在合适的时机唤醒应用执行一次 `runAiKnockOnce()`，生成消息并发出本地通知。

### 平台与限制说明

- 该方案基于：
  - `expo-notifications`
  - `expo-background-fetch`
  - `expo-task-manager`
- 触发频率与时机完全由系统（iOS BGTask / Android WorkManager）控制，`minimumInterval` 只是**下限建议**，不能保证精确的定时。
- 当设备无网络时，`generateAiReply()` 会自动回退到角色脚本（`script`），不会依赖云端 LLM。


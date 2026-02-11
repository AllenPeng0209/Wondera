# Expo Mobile 前端 → 後端數據庫 完整整理

基於對 `apps/mobile` 的完整檢視，以下列出**所有涉及持久化/遠端**的資料，並標註「已在後端」「應放到後端」「暫留本地」。

---

## 一、已在後端 / Supabase 的資料（Mobile 有使用）

| 實體 | 表名 | 來源 | Mobile 使用方式 | 備註 |
|------|------|------|-----------------|------|
| **角色** | `roles` | Supabase | `cloud.fetchRemoteRoles()` → 寫入本地 `roles` 表，`getRoles()` 讀本地 | 啟動時同步，Discover/聊天列表用 |
| **角色預設開場** | `role_seed_messages` | Supabase | `cloud.fetchRoleSeedMessages()` → 用於初始化對話種子 | 直連 Supabase REST |
| **探索內容** | `explore_items` | Supabase | `cloud.loadExploreCache()` → `explorePosts.js` 的 `loadExplorePosts()`，Discover 用 | 有遠端則用遠端，否則 fallback 本地 `explorePosts.js` 靜態資料 |
| **每日劇場模板** | `daily_theater_templates` | Supabase | `cloud.fetchDailyTemplates()` → 用於 `ensureRemoteDailyTasks(dayKey)` 抽 3 個模板生成當日任務 | 直連 Supabase |
| **每日劇場任務** | `daily_theater_tasks` | Supabase | `cloud.fetchDailyTasks(dayKey)`、`cloud.createDailyTasks()`；完成時目前僅更新**本地** SQLite | 任務列表與創建在 Supabase；完成狀態可改為呼叫 Backend `POST /daily-tasks/complete/{task_id}` |

以上對應的 **Backend API**：`/roles`、`/explore/*`、`/daily-tasks`、`/daily-tasks/complete/{task_id}`；Admin 有 `/admin/roles`、`/admin/explore/items`、每日劇場模板/任務的 CRUD。

---

## 二、僅在 Mobile 本地 SQLite 的資料（結構與用途）

### 2.1 對話與訊息（目前完全本地）

| 表名 | 主要欄位 | 誰在用 | 是否建議放後端 |
|------|----------|--------|----------------|
| **conversations** | id, role_id, title, updated_at, script_cursor | ChatListScreen, ConversationScreen, db 多處 | 若要做「多裝置同步 / 帳號雲端」再上後端；目前 README 寫「User chat history remain local」 |
| **messages** | id, conversation_id, sender, body, kind, media_key, created_at, audio_*, quoted_body | ConversationScreen, addMessage, getMessages | 同上，同步聊天記錄時再上後端 |

### 2.2 用戶與設定（目前完全本地）

| 表名 | 主要欄位 | 誰在用 | 是否建議放後端 |
|------|----------|--------|----------------|
| **user_settings** | id(=default), nickname, gender, chat_background, pin_chart, memory_enabled, currency_balance, wallet_recharge_history, wallet_earn_history, api_provider, api_key, api_model, api_mode, bubble_style, immersive_mode, swipe_reply, wait_to_reply, affection_points, streak_current, streak_best, streak_last_day, mbti, zodiac, birthday, onboarding_done, login_email, login_password, is_logged_in | ProfileScreen, WalletScreen, MallSpaceScreen, OnboardingScreen, LoginEmailScreen, PreferenceSettingsScreen, ApiSettingsScreen, ConversationScreen, GrowthScreen, DailyTasksScreen | **帳號登入後**可考慮同步到後端（偏好、錢包、連續簽到等）；目前無登入則留本地 |

### 2.3 角色維度（目前完全本地）

| 表名 | 主要欄位 | 誰在用 | 是否建議放後端 |
|------|----------|--------|----------------|
| **role_settings** | role_id, allow_emoji, allow_knock, max_replies, persona_note, expression_style, catchphrase, user_personality, nickname_override, gender, chat_background, pin_chat, voice_preset, memory_limit, auto_summary, is_blocked, level, exp, affection, affection_level | 每個角色與用戶的互動設定、等級、好感度 | 若要做「多裝置同步 / 帳號雲端」再上後端 |
| **liked_roles** | role_id, created_at | 收藏角色數（getLikedRolesCount） | 同上，可選同步 |

### 2.4 詞彙與複習（目前完全本地）

| 表名 | 主要欄位 | 誰在用 | 是否建議放後端 |
|------|----------|--------|----------------|
| **vocab_items** | id, term, definition, phonetic, language, example, example_translation, tags, starred, ease, interval_ms, proficiency, next_review_at, last_review_at, mastered, created_at, updated_at, source_role_id, source_conversation_id, source_message_id, audio_url | VocabScreen, GrowthScreen, 對話中加詞 | README 寫「vocab remain local」；若要跨裝置複習再上後端 |
| **vocab_reviews** | vocab_id, rating, scheduled_interval_ms, next_review_at, created_at | recordVocabReview | 同上 |

### 2.5 每日統計與行為（目前完全本地）

| 表名 | 主要欄位 | 誰在用 | 是否建議放後端 |
|------|----------|--------|----------------|
| **daily_learning_stats** | day_key, messages_count, target_hits, vocab_new, vocab_review, tasks_completed, completed, created_at, updated_at | GrowthScreen, ConversationScreen, bumpDailyProgress | 若要做「學習報表 / 多裝置同步」可上後端 |
| **ai_knock_log** | conversation_id, created_at | 拍一拍限流（getAiKnockCountSince, recordAiKnockSend） | 可留本地或上後端做全局限流 |

### 2.6 每日劇場任務（本地副本）

| 表名 | 說明 | 是否建議放後端 |
|------|------|----------------|
| **daily_theater_tasks**（本地） | 從 Supabase 同步下來或由本地 THEATER_POOL fallback 生成；`completeDailyTask` 只更新本地 + 本地 user_settings 錢包/好感 | **任務定義與列表**已在 Supabase；**完成狀態**可改為呼叫 Backend `POST /daily-tasks/complete/{task_id}` 再更新本地，以利跨裝置一致 |

---

## 三、本地靜態 / 種子資料（可遷到後端作為內容源）

| 檔案/來源 | 內容 | 建議 |
|-----------|------|------|
| **data/seeds.js** | `roleSeeds`：antoine, edward, kieran 等完整 persona / greeting / script | 已由 Supabase `roles` + `role_seed_messages` 取代為遠端來源；本地僅作 fetch 失敗時的 fallback |
| **data/explorePosts.js** | `explorePostEntries`、`exploreWorldEntries`：靜態探索貼文/世界 | 已由 Supabase `explore_items` 取代為遠端來源；本地僅作 fallback |
| **db.js 內 THEATER_POOL** | 約 15+ 條每日劇場模板（title, scene, description, reward, difficulty, targetRoleId, targetWords, kickoff） | 可整理成 JSON/種子，寫入 Supabase `daily_theater_templates`，之後由後端/Admin 維護，Mobile 只讀遠端 |

---

## 四、Mobile 與後端 / Supabase 的呼叫關係（簡表）

| 資料 | Mobile 讀取 | Mobile 寫入 | Backend 讀寫 |
|------|-------------|-------------|--------------|
| roles | Supabase → 同步到本地 | 無（Admin/Backend 寫） | Supabase |
| role_seed_messages | Supabase 直讀 | 無 | 可補 Backend/Admin 維護 |
| explore_items | Supabase 直讀 + 本地 fallback | 無 | Supabase |
| daily_theater_templates | Supabase 直讀 | 無 | Supabase + Admin |
| daily_theater_tasks | Supabase 直讀 + 同步到本地 | Supabase `createDailyTasks`；完成僅改本地 | Supabase；完成可改為 Backend `POST /daily-tasks/complete/{id}` |
| conversations / messages | 僅本地 | 僅本地 | 無（暫留本地） |
| user_settings | 僅本地 | 僅本地 | 無（登入後可選同步） |
| role_settings / liked_roles | 僅本地 | 僅本地 | 無 |
| vocab_* / daily_learning_stats | 僅本地 | 僅本地 | 無 |

---

## 五、這 5 項：Supabase vs 本地 DB vs 後端同步（直接回答）

| 實體 | Supabase 要有？ | 本地 SQLite 要有？ | 誰同步誰？後端會自動同步嗎？ |
|------|-----------------|--------------------|------------------------------|
| **roles** | ✅ 必須（唯一正式來源） | ✅ 有**副本** | **Supabase → 本地**：App 啟動時 `fetchRemoteRoles()` 拉遠端，寫入本地 `roles` 表；之後列表/聊天都讀本地。後端**不會**主動推給 App，是 App 自己拉。 |
| **explore_items** | ✅ 必須 | ❌ 沒有表 | 只做**記憶體快取**（`loadExploreCache()`）；失敗時用靜態 `explorePosts.js`。沒有「本地 DB 表」與 Supabase 雙寫。 |
| **daily_theater_templates** | ✅ 必須 | ❌ 沒有表 | 需要時直連 Supabase `fetchDailyTemplates()`，不落本地表。後端/Admin 維護模板；App 只讀。 |
| **daily_theater_tasks** | ✅ 必須 | ✅ 有**副本** | **Supabase → 本地**：`ensureRemoteDailyTasks(dayKey)` 從 Supabase 拉當日任務或透過 Supabase 創建，再 `replaceLocalDailyTasks()` 寫入本地；完成時目前只改本地，可改為再呼叫 Backend `POST /daily-tasks/complete/{id}` 更新 Supabase。後端**不會**主動同步到 App，是 App 拉/寫 Supabase 或經 Backend API。 |
| **role_seed_messages** | ✅ 必須 | ❌ 沒有表 | 啟動時 `fetchRoleSeedMessages()` 拉遠端，只用來**寫入本地 `messages`**（當成對話種子），本地沒有 `role_seed_messages` 表。 |

**結論：**

- **Supabase**：這 5 張表都要存在且有資料，才是「正式來源」。
- **本地 DB**：只有 **roles** 和 **daily_theater_tasks** 在本地有**副本**（App 從 Supabase 拉下來寫入）；其餘 3 項要麼只讀遠端/快取，要麼只把結果寫進別的本地表（如 messages）。
- **後端自動同步？** 不會。後端（FastAPI）是**直接讀寫 Supabase**，不負責「推給 App」。同步是 **App 主動**：啟動或進入相關畫面時從 Supabase 拉資料，需要時寫回 Supabase（例如創建當日任務、或完成任務時若改為呼叫 Backend）。

---

## 六、建議「先放到後端數據庫」的整理（與現有 schema 對齊）

要與現有前後端打通、且**不改變目前「聊天/詞彙/用戶設定留本地」**的設計時，只需確保** Supabase** 具備以下表並有資料，Mobile 已會用：

1. **roles** — 已有 schema + seed，需在 Supabase 建表並跑 seed。
2. **explore_items** — 已有 schema + seed，同上。
3. **daily_theater_templates** — 已有 schema，需建表；種子可從 `db.js` 的 `THEATER_POOL` 抽出寫入。
4. **daily_theater_tasks** — 已有 schema；由 Mobile 或 Backend 依模板按日生成並寫入。
5. **role_seed_messages** — 已有 schema，需建表；種子可從各角色預設開場句整理。

**無需新增表**即可讓目前 Mobile 使用的「需放到後端」的內容全部落在 Supabase；其餘（conversations, messages, user_settings, role_settings, vocab_*, daily_learning_stats, liked_roles, ai_knock_log）維持本地，待日後要做帳號/多裝置同步再規劃上表。

---

## 七、可選的後端行為調整（讓「完成任務」也進後端）

- Mobile 在 `completeDailyTask(taskId)` 時，除更新本地 `daily_theater_tasks.completed` 與 `user_settings` 外，可**多呼叫一次** Backend：  
  `POST /daily-tasks/complete/{task_id}`  
  這樣 Supabase 裡的 `daily_theater_tasks.completed` 會與裝置一致，且未來若有其他端或報表要依「完成狀態」查詢，可依賴後端。

以上為 Expo Mobile 前端代碼中，所有需要或已經放到後端數據庫的資料整理。

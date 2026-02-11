# 前端・後端・Supabase 打通計畫

## 一、現狀與資料流

| 端 | 資料來源 | 說明 |
|----|----------|------|
| **Supabase（阿里雲）** | 資料庫 | 目前 `public` 下尚無業務表，需建表 + 種子 |
| **Backend（FastAPI）** | Supabase | 讀寫 `roles` / `explore_items` / `daily_theater_*`，需 `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` |
| **Web（Next.js）** | Backend API | `getRoles()` / `getPosts()` → `NEXT_PUBLIC_API_BASE` + `/roles`、`/explore/posts` |
| **Mobile（Expo）** | Supabase 直連 + Backend | `cloud.js` 直連 Supabase：roles、explore_items、daily_theater_*、role_seed_messages；部分 API 走 Backend |
| **Admin（Next.js）** | 目前僅本地 | 使用 mock + localStorage，尚未接 Backend |

---

## 二、資料庫需要哪些表（與誰用）

| 表名 | 後端使用 | Web | Mobile | Admin | 說明 |
|------|----------|-----|--------|-------|------|
| **roles** | ✅ | 經 Backend | ✅ 直連 | 將接 Backend | 角色 |
| **explore_items** | ✅ | 經 Backend | ✅ 直連 | 將接 Backend | 探索貼文/世界 |
| **daily_theater_templates** | ✅ | - | ✅ 直連 | 後台用 | 每日劇場模板 |
| **daily_theater_tasks** | ✅ | - | ✅ 直連 | - | 每日劇場任務 |
| **role_seed_messages** | - | - | ✅ 直連 | - | 角色預設開場訊息 |

所有表均在 **public** schema，由 `infra/supabase/schema.sql` 定義。

---

## 三、執行計畫（步驟順序）

### 階段 1：修 schema + 在 Supabase 建表

1. **修復 `infra/supabase/schema.sql`**
   - 表 `role_seed_messages` 有 `set_updated_at` 觸發器但沒有 `updated_at` 欄位，會導致 UPDATE 報錯。
   - **做法**：在 `role_seed_messages` 增加 `updated_at timestamptz not null default now()`。

2. **在 Supabase 執行建表**
   - 在阿里雲 Supabase 專案 **spb-7yrcfbi4r0t4bkev** 的 SQL Editor 中，執行整份 `infra/supabase/schema.sql`（修復後的版本）。
   - 或透過 MCP 的 `execute_sql` 依段執行（先 extension + 5 張表 + function + triggers）。

3. **（可選）RLS 與對外權限**
   - Mobile 用 **anon key** 直連 Supabase 讀取上述 5 張表；若專案開啟 RLS，需為 `anon` 加 **SELECT** 政策。
   - Backend 用 **service_role**，不受 RLS 限制。
   - 若目前 RLS 未開或預設允許讀取，可先建表跑通再補政策。

### 階段 2：種子資料

4. **寫入初始資料**
   - 在 Backend 目錄設定好 `SUPABASE_URL`、`SUPABASE_SERVICE_KEY`（指向 spb-7yrcfbi4r0t4bkev）。
   - 執行：`python services/backend/seed/seed_supabase.py`，會 upsert `roles.json`、`explore_items.json` 到 Supabase。
   - 若有 `daily_theater_templates` 的種子檔，可一併寫入（目前 seed 腳本僅 roles + explore_items）。

### 階段 3：後端與儲存

5. **Backend `.env`**
   - `SUPABASE_URL=https://spb-7yrcfbi4r0t4bkev.supabase.opentrust.net`
   - `SUPABASE_SERVICE_KEY=<從 Dashboard 或 MCP get_supabase_project_api_keys 取得的 service_role key>`
   - `SUPABASE_STORAGE_BUCKET=wondera-assets`（若用上傳功能，需在 Supabase Storage 建立同名 bucket）
   - `ADMIN_USER` / `ADMIN_PASSWORD`、`CORS_ORIGINS` 依需求設定。

6. **Storage bucket（若後端有上傳）**
   - 在 Supabase Dashboard → Storage 建立 `wondera-assets`，並設定為可對外讀取（若需公開 URL）。

### 階段 4：前端對接

7. **Web（Next.js）**
   - 設定 `NEXT_PUBLIC_API_BASE` 指向 Backend（例如 `http://localhost:8000` 或正式環境 Backend URL）。
   - 已使用 `getRoles()` / `getPosts()`，無需改程式，只要 Backend 與 Supabase 通即可。

8. **Mobile（Expo）**
   - 已設定 `EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_ANON_KEY` 指向阿里雲 Supabase，直連讀表即可。
   - `EXPO_PUBLIC_BACKEND_URL` 指向 Backend，用於每日任務完成等需經後端的 API。

9. **Admin**
   - 改為從 Backend 讀寫：用環境變數 `NEXT_PUBLIC_BACKEND_URL`（或與 Web 共用 `NEXT_PUBLIC_API_BASE`）。
   - 角色列表：`GET /admin/roles`；新增/更新/刪除：`POST /admin/roles`、`PATCH /admin/roles/{id}` 等。
   - 探索內容：`GET /admin/explore/items`、`POST /admin/explore/items`、`PATCH /admin/explore/items/{id}`、`DELETE /admin/explore/items/{id}`。
   - 逐步替換 `readRoles` / `writeRoles`（以及探索相關 mock）為上述 API 呼叫。

---

## 四、檢查清單（打通後自檢）

- [ ] Supabase `public` 下存在 5 張表：roles, explore_items, daily_theater_templates, daily_theater_tasks, role_seed_messages。
- [ ] 執行過 seed，roles / explore_items 有資料。
- [ ] Backend 健康檢查或 `GET /roles` 回傳與 Supabase 一致。
- [ ] Web 首頁/探索頁顯示的來自 Backend 的 roles/posts 正確。
- [ ] Mobile 從 Supabase 拉取的 roles、探索、每日劇場、seed messages 正常。
- [ ] Admin 改為呼叫 Backend 後，角色與探索的增刪改與 Supabase 一致。
- [ ] （可選）後端上傳檔案到 `wondera-assets` 且 URL 可訪問。

---

## 五、小結

| 項目 | 動作 |
|------|------|
| **建表** | 修 schema 中 `role_seed_messages`，再在 Supabase 執行整份 schema.sql |
| **種子** | Backend 設定 Supabase 後執行 `seed_supabase.py` |
| **Backend** | 設定 SUPABASE_URL、SUPABASE_SERVICE_KEY、STORAGE_BUCKET |
| **Web** | 設定 NEXT_PUBLIC_API_BASE 指向 Backend |
| **Mobile** | 已指向 Supabase + Backend，無需改設定即可打通 |
| **Admin** | 接 Backend /admin/* API，取代 mock 與 localStorage |

依此計畫執行即可把前端、後端、Supabase 資料庫完整打通，並讓前後端需要的資料都建在 Supabase 且可讀寫一致。

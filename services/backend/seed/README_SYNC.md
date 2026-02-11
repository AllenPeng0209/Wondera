# 從 Mobile 同步到 Supabase

若要將 mobile app 的完整 persona、greeting、script 與頭像同步到 Supabase，依序執行：

1. **匯出 mobile 角色文案**（從專案根目錄或 `services/backend/seed`）  
   ```bash
   python services/backend/seed/extract_mobile_roles.py
   ```  
   會從 `apps/mobile/src/data/seeds.js` 擷取 persona、greeting、script 等，寫出 `roles_from_mobile.json`。

2. **上傳 mobile 頭像到 Supabase Storage 並更新 roles**  
   ```bash
   cd services/backend/seed
   # 需設定 SUPABASE_URL、SUPABASE_SERVICE_KEY（可從 .env 載入）
   python upload_role_assets.py
   ```  
   會上傳 `apps/mobile/assets/antonie.jpg`、`edward.png`、`kieran.jpg` 到 bucket `wondera-assets/roles/`，並更新 `public.roles` 的 `avatar_url`、`hero_image_url`。  
   **注意**：Supabase 專案需已建立 bucket `wondera-assets` 且設為 public。

3. **執行種子**  
   ```bash
   cd services/backend/seed
   python seed_supabase.py
   ```  
   - 若有 `roles_from_mobile.json`，會與 `roles.json` 合併（persona、greeting、script 等來自 mobile，avatar/hero URL 來自 `roles.json` 或已由步驟 2 更新）。  
   - 會 upsert roles、explore_items、daily_theater_templates、role_seed_messages。

完成後 Supabase 中的角色會具備 mobile 的完整 prompt（persona）、greeting、script，以及上傳的頭像 URL。

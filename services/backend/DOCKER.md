# Wondera Backend — Docker 部署說明

## 前置條件

1. **安裝 Docker**  
   - Windows: [Docker Desktop](https://docs.docker.com/desktop/install/windows-install/)  
   - 確認 `docker --version`、`docker compose version` 可用。

2. **設定環境變數**  
   在 `services/backend` 目錄下建立或編輯 `.env`，至少填寫：

   ```env
   SUPABASE_URL=你的_Supabase_專案_URL
   SUPABASE_SERVICE_KEY=你的_Service_Role_Key
   ADMIN_USER=admin
   ADMIN_PASSWORD=請改為強密碼
   SUPABASE_STORAGE_BUCKET=wondera-assets
   CORS_ORIGINS=http://localhost:5173,http://localhost:8000
   ```

   - 若部署到其他網域，請把對應的前端網址加入 `CORS_ORIGINS`（逗號分隔）。

---

## 方式一：用 Docker Compose（推薦本地 / 單機）

在專案根目錄或 `services/backend` 下執行：

```bash
cd services/backend
docker compose up -d
```

- 首次會自動 `docker build` 再啟動。
- 後端會跑在 **http://localhost:8000**。
- **若你剛新增或修改了 API（例如 `/chat/completion`）**，需重建映像後再啟動，否則會 404：
  ```bash
  cd services/backend
  docker compose build --no-cache
  docker compose up -d --force-recreate
  ```
- 查看日誌：`docker compose logs -f backend`
- 停止：`docker compose down`

---

## 方式二：只用 Docker（建映像 + 執行）

```bash
cd services/backend

# 建映像
docker build -t wondera-backend:latest .

# 執行（需把 .env 傳進去）
docker run -d --name wondera-backend -p 8000:8000 --env-file .env wondera-backend:latest
```

- 健康檢查：`curl http://localhost:8000/health`
- 看日誌：`docker logs -f wondera-backend`
- 停止並刪除容器：`docker stop wondera-backend && docker rm wondera-backend`

---

## 驗證

- 瀏覽器或 curl 訪問：`http://localhost:8000/health`  
  應回傳 JSON 表示服務正常。
- 若呼叫 `/roles`、`/explore/items` 等會連 Supabase 的 API，請確認 `.env` 中 Supabase 設定正確，且已在 Supabase SQL Editor 執行過 `infra/supabase/schema.sql`。

---

## 後續可做

| 項目 | 說明 |
|------|------|
| **生產環境** | 建議用 Kubernetes / ECS / 雲端 App 服務掛載 `.env` 或使用 Secret，不要把 `.env`  commit 進版控。 |
| **日誌** | 目前 uvicorn 輸出到 stdout，可用 `docker logs` 或雲端日誌收集（如 CloudWatch、Datadog）集中查看。 |
| **重啟策略** | `docker-compose.yml` 已設 `restart: unless-stopped`，主機重開後容器會自動重啟。 |
| **多階段 / 非 root** | 若需更小映像或以非 root 執行，可在 `Dockerfile` 中改為多階段建置並加 `USER`。 |
| **CI/CD** | 在 CI 中 `docker build` 並 push 到你的映像倉庫（如 ECR、GCR），再在目標環境拉映像並用 `--env-file` 或環境變數啟動。 |

---

## 常見問題

- **RuntimeError: SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY) are required**  
  表示 `.env` 中 `SUPABASE_SERVICE_KEY` 為空。取得方式任選其一：  
  - **Supabase 控制台**：阿里雲 RDS 控制台 → AI 應用開發 → RDS Supabase → 專案 `spb-7yrcfbi4r0t4bkev` → 點「外網連接地址」登入 Supabase → 右上角圖標 → **Command menu** → **Get API keys** → **Copy service API key**，貼到 `services/backend/.env` 的 `SUPABASE_SERVICE_KEY=` 後面。  
  - **阿里雲 API**：呼叫 [DescribeInstanceAuthInfo](https://help.aliyun.com/zh/rds/apsaradb-rds-for-postgresql/api-rdsai-2025-05-07-describeinstanceauthinfo-postgresql) 取得認證資訊。  
  完成後執行 `docker compose restart backend` 或 `docker compose up -d` 重新啟動。
- **ModuleNotFoundError: No module named 'supabase'**  
  在 Docker 裡已透過 `requirements.txt` 安裝依賴，不會再出現；若本機仍報錯，請在本機執行 `pip install -r requirements.txt` 或改用 Docker 執行。
- **CORS 錯誤**  
  確認 `.env` 的 `CORS_ORIGINS` 包含前端實際訪問的 origin（例如 `https://your-app.com`）。
- **Supabase 連線失敗**  
  檢查 `SUPABASE_URL`、`SUPABASE_SERVICE_KEY` 是否正確，以及網路 / 防火牆是否允許連到 Supabase。

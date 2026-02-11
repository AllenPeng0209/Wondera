# Wondera Backend

Python FastAPI service that reads/writes role and explore content from Supabase.

## 1) Configure environment
Create `services/backend/.env`:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_service_role_key
ADMIN_USER=admin
ADMIN_PASSWORD=change_me
SUPABASE_STORAGE_BUCKET=wondera-assets
CORS_ORIGINS=http://localhost:5173,http://localhost:8000
```

For Aliyun Supabase, use the project URL and service role key from your Aliyun console.

## 2) Apply schema
Run the SQL in `infra/supabase/schema.sql` inside Supabase SQL editor.

## 3) Seed sample data (optional)

```
cd services/backend
python seed/seed_supabase.py
```

## 4) Run the API

```
cd services/backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Health check: `GET /health`

## 5) Docker 部署（可選）

用 Docker 建映像並執行，可避免本機缺少 `supabase` 等依賴的問題。詳見 [DOCKER.md](./DOCKER.md)。

```bash
cd services/backend
docker compose up -d
```

## Endpoints
- `GET /roles`
- `GET /roles/{role_id}`
- `POST /roles`
- `PATCH /roles/{role_id}`
- `GET /explore/items`
- `GET /explore/posts`
- `GET /explore/worlds`
- `POST /explore/items`
- `GET /daily-tasks?day_key=YYYY-MM-DD`
- `POST /daily-tasks/complete/{task_id}`
- `GET /admin/roles`
- `POST /admin/roles`
- `PATCH /admin/roles/{role_id}`
- `GET /admin/explore/items`
- `GET /admin/explore/items/{item_id}`
- `POST /admin/explore/items`
- `PATCH /admin/explore/items/{item_id}`
- `DELETE /admin/explore/items/{item_id}`
- `GET /admin/daily-templates`
- `POST /admin/daily-templates`
- `PATCH /admin/daily-templates/{template_id}`
- `DELETE /admin/daily-templates/{template_id}`
- `GET /admin/daily-tasks?day_key=YYYY-MM-DD`
- `POST /admin/daily-tasks/generate?day_key=YYYY-MM-DD&count=3`
- `POST /admin/upload`

## Notes
- `roles.avatar_url` and `roles.hero_image_url` are expected to be full URLs.
- The API maps DB fields into frontend-friendly fields such as `heroImage` and `postType`.
- This backend is focused on dynamic content (roles, explore feed, daily tasks). User chat history and vocab remain local for now.
- Admin endpoints use HTTP Basic auth with `ADMIN_USER`/`ADMIN_PASSWORD`.
- File uploads expect a public Supabase Storage bucket. Set `SUPABASE_STORAGE_BUCKET` to the bucket name.

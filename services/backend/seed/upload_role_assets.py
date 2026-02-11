"""
將 apps/mobile/assets 中的角色頭像上傳到 Supabase Storage，
並更新 public.roles 的 avatar_url、hero_image_url。
需設定環境變數 SUPABASE_URL、SUPABASE_SERVICE_KEY（或從 backend/.env 載入）。
在專案根目錄或 services/backend/seed 執行：python upload_role_assets.py

若出現「Storage endpoint URL should have a trailing slash」為 storage3 內部提示，可忽略。
"""
import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

# backend 目錄
BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")

# 專案根目錄（seed -> backend -> services -> repo）
REPO_ROOT = Path(__file__).resolve().parents[3]
MOBILE_ASSETS = REPO_ROOT / "apps" / "mobile" / "assets"
# 角色 id -> 檔名
ROLE_ASSETS = {
    "antoine": "antonie.jpg",
    "edward": "edward.png",
    "kieran": "kieran.jpg",
}

SUPABASE_URL_RAW = (os.getenv("SUPABASE_URL") or "").strip()
# storage3 要求 URL 以尾隨斜線結尾
SUPABASE_URL = SUPABASE_URL_RAW.rstrip("/") + "/" if SUPABASE_URL_RAW else ""
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "wondera-assets")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY) are required")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_public_url(path_in_bucket: str) -> str:
    base = (SUPABASE_URL or "").rstrip("/")
    if not base:
        return ""
    return f"{base}/storage/v1/object/public/{BUCKET}/{path_in_bucket}"


def ensure_bucket():
    """若 bucket 不存在則建立（public）。"""
    try:
        # storage3: create_bucket(id, name=None, options=...)；options 為第三參數
        supabase.storage.create_bucket(BUCKET, name=None, options={"public": True})
        print(f"Created bucket: {BUCKET}")
    except Exception as e:
        msg = str(e).lower()
        # 僅忽略「已存在」類錯誤，不吞掉 "bucket not found" 等
        if "already exists" in msg or "duplicate" in msg:
            pass
        else:
            raise
    return supabase.storage.from_(BUCKET)


def main():
    if not MOBILE_ASSETS.exists():
        print(f"Not found: {MOBILE_ASSETS}")
        return
    storage = ensure_bucket()
    for role_id, filename in ROLE_ASSETS.items():
        local = MOBILE_ASSETS / filename
        if not local.exists():
            print(f"Skip {role_id}: {local} not found")
            continue
        path_in_bucket = f"roles/{filename}"
        content = local.read_bytes()
        content_type = "image/jpeg" if filename.lower().endswith(".jpg") else "image/png"
        storage.upload(path_in_bucket, content, {"content-type": content_type, "x-upsert": "true"})
        url = get_public_url(path_in_bucket)
        supabase.table("roles").update({
            "avatar_url": url,
            "hero_image_url": url,
        }).eq("id", role_id).execute()
        print(f"Uploaded {filename} -> {path_in_bucket}, updated roles.{role_id}")
    print("Done. Run seed_supabase.py to sync persona/greeting/script if needed.")


if __name__ == "__main__":
    main()

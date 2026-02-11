import json
import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

ROOT = Path(__file__).resolve().parents[1]
# 從 backend 目錄載入 .env
load_dotenv(ROOT / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY) are required")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def upsert_roles():
    seed_dir = ROOT / "seed"
    base_roles = load_json(seed_dir / "roles.json")
    if not base_roles:
        return
    # 若有 mobile 匯出的完整 persona/script/greeting，合併進去並保留 base 的 avatar_url/hero_image_url
    from_mobile = seed_dir / "roles_from_mobile.json"
    if from_mobile.exists():
        mobile_roles = load_json(from_mobile)
        by_id = {r["id"]: r for r in base_roles}
        for m in mobile_roles:
            rid = m.get("id")
            if rid and rid in by_id:
                base = by_id[rid]
                base["persona"] = m.get("persona") or base.get("persona")
                base["mood"] = m.get("mood") or base.get("mood")
                base["greeting"] = m.get("greeting") or base.get("greeting")
                base["script"] = m.get("script") if m.get("script") is not None else base.get("script", [])
                base["title"] = m.get("title") or base.get("title")
                base["city"] = m.get("city") or base.get("city")
                base["description"] = m.get("description") or base.get("description")
                base["tags"] = m.get("tags") if m.get("tags") is not None else base.get("tags", [])
        print("Merged roles_from_mobile.json (persona, greeting, script, etc.)")
    supabase.table("roles").upsert(base_roles).execute()
    print(f"Upserted {len(base_roles)} roles")


def upsert_explore_items():
    items = load_json(ROOT / "seed" / "explore_items.json")
    if not items:
        return
    for it in items:
        if "world" not in it or it["world"] is None:
            it["world"] = {}
        if "recommended_roles" not in it or it["recommended_roles"] is None:
            it["recommended_roles"] = []
        if "content" not in it or it["content"] is None:
            it["content"] = []
    supabase.table("explore_items").upsert(items).execute()
    print(f"Upserted {len(items)} explore items")


def upsert_daily_theater_templates():
    path = ROOT / "seed" / "daily_theater_templates.json"
    if not path.exists():
        return
    templates = load_json(path)
    if not templates:
        return
    supabase.table("daily_theater_templates").upsert(templates).execute()
    print(f"Upserted {len(templates)} daily_theater_templates")


def upsert_role_seed_messages():
    roles = load_json(ROOT / "seed" / "roles.json")
    if not roles:
        return
    rows = []
    for r in roles:
        role_id = r.get("id")
        greeting = (r.get("greeting") or "").strip()
        if not role_id or not greeting:
            continue
        rows.append({
            "role_id": role_id,
            "conversation_id": f"{role_id}-default",
            "position": 0,
            "sender": "ai",
            "body": greeting,
        })
    if not rows:
        return
    supabase.table("role_seed_messages").upsert(rows, on_conflict="role_id,position").execute()
    print(f"Upserted {len(rows)} role_seed_messages")


if __name__ == "__main__":
    upsert_roles()
    upsert_explore_items()
    upsert_daily_theater_templates()
    upsert_role_seed_messages()
    print("Seed complete")

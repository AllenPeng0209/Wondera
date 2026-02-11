import os
import re
import secrets
import uuid
import mimetypes
import time
from datetime import date
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, Field
from supabase import Client, create_client

load_dotenv()

app = FastAPI(title="Wondera Backend", version="0.1.0")
security = HTTPBasic()

_SUPABASE_CLIENT: Optional[Client] = None


def get_supabase() -> Client:
    global _SUPABASE_CLIENT
    if _SUPABASE_CLIENT is not None:
        return _SUPABASE_CLIENT
    url = (os.getenv("SUPABASE_URL") or "").strip()
    key = (os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or "").strip()
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY) are required")
    _SUPABASE_CLIENT = create_client(url, key)
    return _SUPABASE_CLIENT


def ensure_ok(response, context: str = "request"):
    if hasattr(response, "error") and response.error:
        message = getattr(response.error, "message", None) or str(response.error)
        raise HTTPException(status_code=500, detail=f"Supabase {context} failed: {message}")
    return response.data


def role_to_api(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row.get("id"),
        "name": row.get("name"),
        "avatar": row.get("avatar_url") or row.get("avatar"),
        "heroImage": row.get("hero_image_url") or row.get("hero_image"),
        "persona": row.get("persona"),
        "mood": row.get("mood"),
        "greeting": row.get("greeting"),
        "title": row.get("title"),
        "city": row.get("city"),
        "description": row.get("description"),
        "tags": row.get("tags") or [],
        "script": row.get("script") or [],
        "status": row.get("status"),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


def explore_to_api(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row.get("id"),
        "type": row.get("type"),
        "postType": row.get("post_type"),
        "worldType": row.get("world_type"),
        "title": row.get("title"),
        "summary": row.get("summary"),
        "location": row.get("location"),
        "tags": row.get("tags") or [],
        "author": {
            "name": row.get("author_name"),
            "label": row.get("author_label"),
            "avatar": row.get("author_avatar_url"),
        },
        "images": row.get("images") or [],
        "coverHeight": row.get("cover_height"),
        "stats": row.get("stats") or {},
        "createdAt": row.get("created_at"),
        "content": row.get("content") or [],
        "world": row.get("world") or {},
        "targetRoleId": row.get("target_role_id"),
        "recommendedRoles": row.get("recommended_roles") or [],
    }


def model_to_dict(model):
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def get_admin_credentials() -> Dict[str, str]:
    return {
        "user": os.getenv("ADMIN_USER", ""),
        "password": os.getenv("ADMIN_PASSWORD", ""),
    }


def require_admin(credentials: HTTPBasicCredentials = Depends(security)) -> str:
    admin = get_admin_credentials()
    if not admin["user"] or not admin["password"]:
        raise HTTPException(status_code=500, detail="Admin credentials not configured")
    user_ok = secrets.compare_digest(credentials.username or "", admin["user"])
    pass_ok = secrets.compare_digest(credentials.password or "", admin["password"])
    if not (user_ok and pass_ok):
        raise HTTPException(status_code=401, detail="Unauthorized")
    return credentials.username


def sanitize_filename(name: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9._-]", "_", name or "upload")
    return safe[:120] or "upload"


def build_public_url(bucket: str, path: str) -> str:
    base = os.getenv("SUPABASE_STORAGE_PUBLIC_URL")
    if base:
        return f"{base.rstrip('/')}/{bucket}/{path}"
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    if not url:
        return f"/storage/{bucket}/{path}"
    return f"{url}/storage/v1/object/public/{bucket}/{path}"


def parse_cors_origins(value: Optional[str]) -> List[str]:
    if not value:
        return ["*"]
    return [item.strip() for item in value.split(",") if item.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(os.getenv("CORS_ORIGINS")),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RoleCreate(BaseModel):
    id: Optional[str] = None
    name: str
    avatar_url: Optional[str] = None
    hero_image_url: Optional[str] = None
    persona: Optional[str] = None
    mood: Optional[str] = None
    greeting: Optional[str] = None
    title: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    script: List[str] = Field(default_factory=list)
    status: Optional[str] = "published"


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    hero_image_url: Optional[str] = None
    persona: Optional[str] = None
    mood: Optional[str] = None
    greeting: Optional[str] = None
    title: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    script: Optional[List[str]] = None
    status: Optional[str] = None


class ExploreItemCreate(BaseModel):
    id: Optional[str] = None
    type: str
    title: str
    summary: Optional[str] = None
    post_type: Optional[str] = None
    world_type: Optional[str] = None
    location: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    author_name: Optional[str] = None
    author_label: Optional[str] = None
    author_avatar_url: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    cover_height: Optional[int] = None
    stats: Dict[str, Any] = Field(default_factory=dict)
    content: List[str] = Field(default_factory=list)
    world: Dict[str, Any] = Field(default_factory=dict)
    target_role_id: Optional[str] = None
    recommended_roles: List[str] = Field(default_factory=list)


class ExploreItemUpdate(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    post_type: Optional[str] = None
    world_type: Optional[str] = None
    location: Optional[str] = None
    tags: Optional[List[str]] = None
    author_name: Optional[str] = None
    author_label: Optional[str] = None
    author_avatar_url: Optional[str] = None
    images: Optional[List[str]] = None
    cover_height: Optional[int] = None
    stats: Optional[Dict[str, Any]] = None
    content: Optional[List[str]] = None
    world: Optional[Dict[str, Any]] = None
    target_role_id: Optional[str] = None
    recommended_roles: Optional[List[str]] = None


class DailyTemplateCreate(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    scene: Optional[str] = None
    target_role_id: Optional[str] = None
    kickoff_prompt: Optional[str] = None
    difficulty: Optional[str] = None
    target_words: List[str] = Field(default_factory=list)
    reward_points: Optional[int] = 5


class DailyTemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scene: Optional[str] = None
    target_role_id: Optional[str] = None
    kickoff_prompt: Optional[str] = None
    difficulty: Optional[str] = None
    target_words: Optional[List[str]] = None
    reward_points: Optional[int] = None

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/roles")
def list_roles(
    include_unpublished: bool = Query(False, description="Include non-published roles"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    supabase = get_supabase()
    query = supabase.table("roles").select("*").order("name", desc=False).range(offset, offset + limit - 1)
    if not include_unpublished:
        query = query.eq("status", "published")
    result = ensure_ok(query.execute(), context="list roles")
    return [role_to_api(row) for row in (result or [])]


@app.get("/roles/{role_id}")
def get_role(role_id: str):
    supabase = get_supabase()
    result = ensure_ok(
        supabase.table("roles").select("*").eq("id", role_id).single().execute(),
        context="get role",
    )
    if not result:
        raise HTTPException(status_code=404, detail="Role not found")
    return role_to_api(result)


# Supabase roles 表欄位（與 seed roles.json 一致，不含 status 以免表無此欄時報錯）
_ROLES_INSERT_KEYS = ("id", "name", "avatar_url", "hero_image_url", "persona", "mood", "greeting", "title", "city", "description", "tags", "script")


@app.post("/roles")
def create_role(payload: RoleCreate):
    supabase = get_supabase()
    role_id = payload.id or f"role-{uuid.uuid4().hex[:10]}"
    raw = payload.model_dump(exclude_none=True)
    data = {k: raw[k] for k in _ROLES_INSERT_KEYS if k in raw}
    data["id"] = role_id
    data.setdefault("name", payload.name)
    result = ensure_ok(supabase.table("roles").insert(data).execute(), context="create role")
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create role")
    return role_to_api(result[0])


@app.patch("/roles/{role_id}")
def update_role(role_id: str, payload: RoleUpdate):
    supabase = get_supabase()
    updates = {k: v for k, v in model_to_dict(payload).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    result = ensure_ok(
        supabase.table("roles").update(updates).eq("id", role_id).execute(),
        context="update role",
    )
    if not result:
        raise HTTPException(status_code=404, detail="Role not found")
    return role_to_api(result[0])


# ------------------- Chat (Qwen/DashScope) -------------------

DASHSCOPE_API_KEY = (os.getenv("DASHSCOPE_API_KEY") or os.getenv("BAILIAN_API_KEY") or "").strip()
DASHSCOPE_ENDPOINT = (os.getenv("DASHSCOPE_ENDPOINT") or "https://dashscope.aliyuncs.com").strip().rstrip("/")
CHAT_COMPLETIONS_PATH = "/compatible-mode/v1/chat/completions"
DEFAULT_CHAT_MODEL = os.getenv("DASHSCOPE_CHAT_MODEL", "qwen-turbo")


def build_system_prompt(role: Dict[str, Any]) -> str:
    name = role.get("name") or "角色"
    persona = (role.get("persona") or "").strip()
    greeting = (role.get("greeting") or "").strip()
    parts = [f"请严格扮演「{name}」，具备以下设定：", persona]
    if greeting:
        parts.append(f"首句/开场示例：{greeting[:200]}")
    parts.append("回复要求：只用口语化第一人称对话，不写旁白、动作或场景描写；不要使用括号/星号等舞台指令；保持简短，单条回复尽量控制在30-80个汉字。")
    return "\n\n".join(p for p in parts if p)


def call_qwen(system: str, messages: List[Dict[str, str]], model: str = DEFAULT_CHAT_MODEL) -> str:
    if not DASHSCOPE_API_KEY:
        raise HTTPException(status_code=503, detail="DASHSCOPE_API_KEY (or BAILIAN_API_KEY) not configured")
    url = f"{DASHSCOPE_ENDPOINT}{CHAT_COMPLETIONS_PATH}"
    payload = {
        "model": model,
        "messages": [{"role": "system", "content": system}] + messages,
        "temperature": 0.7,
        "top_p": 0.8,
    }
    with httpx.Client(timeout=60.0) as client:
        resp = client.post(
            url,
            headers={"Authorization": f"Bearer {DASHSCOPE_API_KEY}", "Content-Type": "application/json"},
            json=payload,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Qwen API error: {resp.status_code} - {resp.text[:300]}")
    data = resp.json()
    content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
    return (content or "").strip()


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatCompletionRequest(BaseModel):
    role_id: Optional[str] = None
    role: Optional[Dict[str, Any]] = None  # { name, persona, greeting } for admin inline
    messages: List[ChatMessage] = Field(default_factory=list, max_length=30)


@app.post("/chat/completion")
def chat_completion(payload: ChatCompletionRequest):
    if not payload.messages:
        raise HTTPException(status_code=400, detail="messages required")
    role: Dict[str, Any]
    if payload.role:
        role = payload.role
    elif payload.role_id:
        supabase = get_supabase()
        row = ensure_ok(
            supabase.table("roles").select("*").eq("id", payload.role_id).single().execute(),
            context="get role for chat",
        )
        if not row:
            raise HTTPException(status_code=404, detail="Role not found")
        role = {"name": row.get("name"), "persona": row.get("persona"), "greeting": row.get("greeting")}
    else:
        raise HTTPException(status_code=400, detail="role_id or role required")
    system = build_system_prompt(role)
    api_messages = [{"role": m.role, "content": (m.content or "").strip()} for m in payload.messages[-20:]]
    if not api_messages:
        raise HTTPException(status_code=400, detail="messages required")
    content = call_qwen(system, api_messages)
    return {"content": content}


# ------------------- Wan 2.2 Image & Video (DashScope) -------------------

WAN_IMAGE_MODEL = (os.getenv("WAN_IMAGE_MODEL") or "wan2.2-t2i-plus").strip() or "wan2.2-t2i-plus"
WAN_VIDEO_MODEL = (os.getenv("WAN_VIDEO_MODEL") or "wan2.2-i2v-plus").strip() or "wan2.2-i2v-plus"
WAN_IMAGE_PATH = "/api/v1/services/aigc/text2image/image-synthesis"
WAN_VIDEO_PATH = "/api/v1/services/aigc/video-generation/video-synthesis"
WAN_TASK_PATH = "/api/v1/tasks/{task_id}"
WAN_POLL_ATTEMPTS = int(os.getenv("WAN_POLL_ATTEMPTS", "40"))
WAN_POLL_INTERVAL = float(os.getenv("WAN_POLL_INTERVAL", "3.0"))


class WanImageRequest(BaseModel):
    prompt: str = Field(..., description="文本提示，例：电影光影的都市帅哥特写")
    size: Optional[str] = Field("1280*720", description="宽*高，例如 1440*810")
    negative_prompt: Optional[str] = Field(None, description="可选的反向提示")
    seed: Optional[int] = Field(None, ge=0, le=4294967295)
    role_id: Optional[str] = Field(None, description="归属角色，用于存储路径")
    save: bool = Field(False, description="是否保存到 Supabase 存储")


class WanVideoRequest(BaseModel):
    image_url: str = Field(..., description="要转视频的图片 URL，需要公网可访问")
    prompt: Optional[str] = Field(None, description="视频动效提示，可选")
    duration: Optional[int] = Field(5, ge=1, le=10, description="视频时长，秒")
    resolution: Optional[str] = Field("720P", description="分辨率 720P/1080P")
    role_id: Optional[str] = Field(None, description="归属角色，用于存储路径")
    save: bool = Field(False, description="是否保存视频到存储")


class WanAssetSaveRequest(BaseModel):
    url: str = Field(..., description="要保存的资源 URL")
    role_id: Optional[str] = Field(None, description="归属角色，用于存储路径")
    kind: Optional[str] = Field("assets", description="子目录，例如 images / videos")


def get_dashscope_headers(async_mode: bool = False) -> Dict[str, str]:
    if not DASHSCOPE_API_KEY:
        raise HTTPException(status_code=503, detail="DASHSCOPE_API_KEY (or BAILIAN_API_KEY) not configured")
    headers = {"Authorization": f"Bearer {DASHSCOPE_API_KEY}", "Content-Type": "application/json"}
    if async_mode:
        headers["X-DashScope-Async"] = "enable"
    return headers


def submit_wan_task(path: str, payload: Dict[str, Any]) -> str:
    url = f"{DASHSCOPE_ENDPOINT}{path}"
    with httpx.Client(timeout=60.0) as client:
        resp = client.post(url, headers=get_dashscope_headers(async_mode=True), json=payload)
    if resp.status_code not in (200, 202):
        raise HTTPException(status_code=502, detail=f"Wan API error {resp.status_code}: {resp.text[:300]}")
    data = resp.json()
    task_id = (data.get("output") or {}).get("task_id") or data.get("task_id") or (data.get("data") or {}).get("task_id")
    if not task_id:
        raise HTTPException(status_code=502, detail="Wan API did not return task_id")
    return task_id


def poll_wan_task(task_id: str) -> Dict[str, Any]:
    url = f"{DASHSCOPE_ENDPOINT}{WAN_TASK_PATH.format(task_id=task_id)}"
    headers = get_dashscope_headers()
    for _ in range(WAN_POLL_ATTEMPTS):
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(url, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Wan task query failed: {resp.status_code} {resp.text[:200]}")
        data = resp.json()
        output = data.get("output") or data
        status = output.get("task_status") or output.get("status")
        if status in ("PENDING", "RUNNING", "QUEUED", None):
            time.sleep(WAN_POLL_INTERVAL)
            continue
        if status == "SUCCEEDED":
            return output.get("result") or output
        if status in ("FAILED", "CANCELED", "TIMEOUT"):
            message = output.get("message") or output.get("error") or "Wan task failed"
            raise HTTPException(status_code=502, detail=message)
        time.sleep(WAN_POLL_INTERVAL)
    raise HTTPException(status_code=504, detail="Wan task polling timed out")


def extract_image_url(result: Dict[str, Any]) -> Optional[str]:
    candidates = [result.get("image_url"), result.get("url")]
    nested = result.get("results") or result.get("data") or []
    if isinstance(nested, dict):
        nested = nested.get("results") or []
    if isinstance(nested, list) and nested:
        candidates.extend([nested[0].get("url"), nested[0].get("image_url")])
    return next((c for c in candidates if c), None)


def extract_video_url(result: Dict[str, Any]) -> Optional[str]:
    candidates = [result.get("video_url"), result.get("video"), result.get("url")]
    nested = result.get("results") or result.get("data") or []
    if isinstance(nested, dict):
        nested = nested.get("results") or []
    if isinstance(nested, list) and nested:
        candidates.extend([nested[0].get("video_url"), nested[0].get("url")])
    return next((c for c in candidates if c), None)


def guess_extension(url: str, content_type: Optional[str]) -> str:
    ext = ""
    if content_type:
        ext = mimetypes.guess_extension(content_type.split(";")[0].strip()) or ""
    if not ext:
        lower = (url or "").lower()
        for suffix in (".png", ".jpg", ".jpeg", ".webp", ".mp4", ".mov", ".webm"):
            if lower.endswith(suffix):
                ext = suffix
                break
    return ext or ".bin"


def save_remote_asset(remote_url: str, prefix: str) -> Dict[str, str]:
    supabase = get_supabase()
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "wondera-assets")
    if not remote_url:
        raise HTTPException(status_code=400, detail="remote_url is required for saving")
    try:
        resp = httpx.get(remote_url, timeout=120.0)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Download asset failed: {exc}") from exc
    if resp.status_code != 200 or not resp.content:
        raise HTTPException(status_code=502, detail=f"Download asset failed: {resp.status_code}")
    content_type = resp.headers.get("content-type") or "application/octet-stream"
    ext = guess_extension(remote_url, content_type)
    path = f"{prefix.rstrip('/')}/{uuid.uuid4().hex}{ext}"
    result = supabase.storage.from_(bucket).upload(path, resp.content, {"content-type": content_type, "x-upsert": "true"})
    if hasattr(result, "error") and result.error:
        message = getattr(result.error, "message", None) or str(result.error)
        raise HTTPException(status_code=500, detail=f"Upload failed: {message}")
    url = build_public_url(bucket, path)
    return {"url": url, "path": path, "bucket": bucket, "contentType": content_type}


@app.post("/ai/wan/image")
def wan_generate_image(payload: WanImageRequest):
    prompt = (payload.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")
    size = (payload.size or "1280*720").strip()
    body: Dict[str, Any] = {
        "model": WAN_IMAGE_MODEL,
        "input": {"prompt": prompt},
        "parameters": {"size": size, "n": 1},
    }
    if payload.negative_prompt:
        body["input"]["negative_prompt"] = payload.negative_prompt.strip()
    if payload.seed is not None:
        body["parameters"]["seed"] = payload.seed
    task_id = submit_wan_task(WAN_IMAGE_PATH, body)
    result = poll_wan_task(task_id)
    image_url = extract_image_url(result)
    if not image_url:
        raise HTTPException(status_code=502, detail="Wan image task did not return image url")
    owner = sanitize_filename(payload.role_id or "wan")
    saved = save_remote_asset(image_url, f"roles/{owner}/images") if payload.save else None
    return {
        "taskId": task_id,
        "status": "SUCCEEDED",
        "imageUrl": image_url,
        "saved": saved,
        "prompt": prompt,
        "model": WAN_IMAGE_MODEL,
    }


@app.post("/ai/wan/video-from-image")
def wan_image_to_video(payload: WanVideoRequest):
    img_url = (payload.image_url or "").strip()
    if not img_url:
        raise HTTPException(status_code=400, detail="image_url is required")
    duration = payload.duration or 5
    resolution = (payload.resolution or "720P").upper()
    prompt = (payload.prompt or "电影感慢推镜头，情绪丰富的呼吸与眨眼").strip()
    body: Dict[str, Any] = {
        "model": WAN_VIDEO_MODEL,
        "input": {"img_url": img_url, "prompt": prompt},
        "parameters": {"resolution": resolution, "duration": duration},
    }
    task_id = submit_wan_task(WAN_VIDEO_PATH, body)
    result = poll_wan_task(task_id)
    video_url = extract_video_url(result)
    if not video_url:
        raise HTTPException(status_code=502, detail="Wan video task did not return video url")
    owner = sanitize_filename(payload.role_id or "wan")
    saved = save_remote_asset(video_url, f"roles/{owner}/videos") if payload.save else None
    cover = extract_image_url(result) or result.get("cover_image_url")
    return {
        "taskId": task_id,
        "status": "SUCCEEDED",
        "videoUrl": video_url,
        "coverImageUrl": cover,
        "saved": saved,
        "prompt": prompt,
        "model": WAN_VIDEO_MODEL,
        "duration": duration,
        "resolution": resolution,
    }


@app.post("/ai/wan/save")
def wan_save_existing_asset(payload: WanAssetSaveRequest):
    target = sanitize_filename(payload.role_id or "wan")
    kind = sanitize_filename(payload.kind or "assets")
    saved = save_remote_asset(payload.url, f"roles/{target}/{kind}")
    return {"saved": saved}


@app.get("/explore/items")
def list_explore_items(
    item_type: Optional[str] = Query(None, description="Filter by type: post or world"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    supabase = get_supabase()
    query = (
        supabase.table("explore_items")
        .select("*")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    if item_type:
        query = query.eq("type", item_type)
    result = ensure_ok(query.execute(), context="list explore items")
    return [explore_to_api(row) for row in (result or [])]


@app.get("/explore/posts")
def list_explore_posts(limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)):
    return list_explore_items(item_type="post", limit=limit, offset=offset)


@app.get("/explore/worlds")
def list_explore_worlds(limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)):
    return list_explore_items(item_type="world", limit=limit, offset=offset)


@app.post("/explore/items")
def create_explore_item(payload: ExploreItemCreate):
    supabase = get_supabase()
    item_id = payload.id or f"explore-{uuid.uuid4().hex[:10]}"
    data = model_to_dict(payload)
    data["id"] = item_id
    result = ensure_ok(supabase.table("explore_items").insert(data).execute(), context="create explore item")
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create explore item")
    return explore_to_api(result[0])


@app.get("/daily-tasks")
def list_daily_tasks(day_key: str = Query(..., description="YYYY-MM-DD")):
    supabase = get_supabase()
    result = ensure_ok(
        supabase.table("daily_theater_tasks").select("*").eq("day_key", day_key).execute(),
        context="list daily tasks",
    )
    return result or []


@app.post("/daily-tasks/complete/{task_id}")
def complete_daily_task(task_id: str):
    supabase = get_supabase()
    result = ensure_ok(
        supabase.table("daily_theater_tasks").update({"completed": True}).eq("id", task_id).execute(),
        context="complete daily task",
    )
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return result[0]


# ------------------- Admin APIs -------------------


@app.get("/admin/roles")
def admin_list_roles(
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    _: str = Depends(require_admin),
):
    supabase = get_supabase()
    result = ensure_ok(
        supabase.table("roles").select("*").order("name", desc=False).range(offset, offset + limit - 1).execute(),
        context="admin list roles",
    )
    return [role_to_api(row) for row in (result or [])]


@app.post("/admin/roles")
def admin_create_role(payload: RoleCreate, _: str = Depends(require_admin)):
    return create_role(payload)


@app.patch("/admin/roles/{role_id}")
def admin_update_role(role_id: str, payload: RoleUpdate, _: str = Depends(require_admin)):
    return update_role(role_id, payload)


@app.get("/admin/explore/items")
def admin_list_explore_items(
    item_type: Optional[str] = Query(None, description="Filter by type: post or world"),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    _: str = Depends(require_admin),
):
    return list_explore_items(item_type=item_type, limit=limit, offset=offset)


@app.get("/admin/explore/items/{item_id}")
def admin_get_explore_item(item_id: str, _: str = Depends(require_admin)):
    supabase = get_supabase()
    result = ensure_ok(
        supabase.table("explore_items").select("*").eq("id", item_id).single().execute(),
        context="admin get explore item",
    )
    if not result:
        raise HTTPException(status_code=404, detail="Explore item not found")
    return explore_to_api(result)


@app.post("/admin/explore/items")
def admin_create_explore_item(payload: ExploreItemCreate, _: str = Depends(require_admin)):
    return create_explore_item(payload)


@app.patch("/admin/explore/items/{item_id}")
def admin_update_explore_item(item_id: str, payload: ExploreItemUpdate, _: str = Depends(require_admin)):
    supabase = get_supabase()
    updates = {k: v for k, v in model_to_dict(payload).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    result = ensure_ok(
        supabase.table("explore_items").update(updates).eq("id", item_id).execute(),
        context="admin update explore item",
    )
    if not result:
        raise HTTPException(status_code=404, detail="Explore item not found")
    return explore_to_api(result[0])


@app.delete("/admin/explore/items/{item_id}")
def admin_delete_explore_item(item_id: str, _: str = Depends(require_admin)):
    supabase = get_supabase()
    result = ensure_ok(
        supabase.table("explore_items").delete().eq("id", item_id).execute(),
        context="admin delete explore item",
    )
    if not result:
        raise HTTPException(status_code=404, detail="Explore item not found")
    return {"deleted": item_id}


@app.get("/admin/daily-templates")
def admin_list_daily_templates(
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    _: str = Depends(require_admin),
):
    supabase = get_supabase()
    result = ensure_ok(
        supabase.table("daily_theater_templates").select("*").order("created_at", desc=True).range(offset, offset + limit - 1).execute(),
        context="admin list daily templates",
    )
    return result or []


@app.post("/admin/daily-templates")
def admin_create_daily_template(payload: DailyTemplateCreate, _: str = Depends(require_admin)):
    supabase = get_supabase()
    template_id = payload.id or f"template-{uuid.uuid4().hex[:10]}"
    data = model_to_dict(payload)
    data["id"] = template_id
    result = ensure_ok(
        supabase.table("daily_theater_templates").insert(data).execute(),
        context="admin create daily template",
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create daily template")
    return result[0]


@app.patch("/admin/daily-templates/{template_id}")
def admin_update_daily_template(
    template_id: str, payload: DailyTemplateUpdate, _: str = Depends(require_admin)
):
    supabase = get_supabase()
    updates = {k: v for k, v in model_to_dict(payload).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    result = ensure_ok(
        supabase.table("daily_theater_templates").update(updates).eq("id", template_id).execute(),
        context="admin update daily template",
    )
    if not result:
        raise HTTPException(status_code=404, detail="Daily template not found")
    return result[0]


@app.delete("/admin/daily-templates/{template_id}")
def admin_delete_daily_template(template_id: str, _: str = Depends(require_admin)):
    supabase = get_supabase()
    result = ensure_ok(
        supabase.table("daily_theater_templates").delete().eq("id", template_id).execute(),
        context="admin delete daily template",
    )
    if not result:
        raise HTTPException(status_code=404, detail="Daily template not found")
    return {"deleted": template_id}


@app.get("/admin/daily-tasks")
def admin_list_daily_tasks(day_key: str = Query(..., description="YYYY-MM-DD"), _: str = Depends(require_admin)):
    return list_daily_tasks(day_key)


@app.post("/admin/daily-tasks/generate")
def admin_generate_daily_tasks(
    day_key: date = Query(..., description="YYYY-MM-DD"),
    count: int = Query(3, ge=1, le=10),
    _: str = Depends(require_admin),
):
    supabase = get_supabase()
    templates = ensure_ok(
        supabase.table("daily_theater_templates").select("*").execute(),
        context="admin load daily templates",
    )
    if not templates:
        raise HTTPException(status_code=400, detail="No daily templates available")
    # Shuffle and pick
    shuffled = list(templates)
    secrets.SystemRandom().shuffle(shuffled)
    selected = shuffled[: min(count, len(shuffled))]
    day_key_value = day_key.isoformat()
    # Remove existing tasks for the day
    ensure_ok(
        supabase.table("daily_theater_tasks").delete().eq("day_key", day_key_value).execute(),
        context="admin clear daily tasks",
    )
    payloads = []
    for template in selected:
        payloads.append(
            {
                "day_key": day_key_value,
                "template_id": template.get("id"),
                "title": template.get("title"),
                "description": template.get("description"),
                "scene": template.get("scene"),
                "target_role_id": template.get("target_role_id"),
                "kickoff_prompt": template.get("kickoff_prompt"),
                "difficulty": template.get("difficulty"),
                "target_words": template.get("target_words") or [],
                "reward_points": template.get("reward_points") or 5,
                "completed": False,
            }
        )
    result = ensure_ok(
        supabase.table("daily_theater_tasks").insert(payloads).execute(),
        context="admin generate daily tasks",
    )
    return result or []


@app.post("/admin/upload")
def admin_upload_asset(file: UploadFile = File(...), _: str = Depends(require_admin)):
    supabase = get_supabase()
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "wondera-assets")
    content = file.file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    filename = sanitize_filename(file.filename or "upload")
    path = f"admin/{uuid.uuid4().hex}-{filename}"
    content_type = file.content_type or "application/octet-stream"
    result = supabase.storage.from_(bucket).upload(
        path,
        content,
        {"content-type": content_type, "x-upsert": "true"},
    )
    if hasattr(result, "error") and result.error:
        message = getattr(result.error, "message", None) or str(result.error)
        raise HTTPException(status_code=500, detail=f"Upload failed: {message}")
    url = build_public_url(bucket, path)
    try:
        public = supabase.storage.from_(bucket).get_public_url(path)
        if isinstance(public, dict):
            url = public.get("publicURL") or public.get("publicUrl") or url
        elif isinstance(public, str):
            url = public
    except Exception:
        pass
    return {"url": url, "path": path, "bucket": bucket}

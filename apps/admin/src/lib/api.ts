import type { Role } from "./types";

/** 後端 PATCH /admin/roles/{id} 接受的欄位 */
export type RoleUpdatePayload = {
  name?: string;
  avatar_url?: string;
  hero_image_url?: string;
  persona?: string;
  mood?: string;
  greeting?: string;
  title?: string;
  city?: string;
  description?: string;
  tags?: string[];
  script?: string[];
  status?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE;

async function sendJson<T>(path: string, body: unknown, method: "POST" | "PATCH" = "POST"): Promise<T> {
  if (!API_BASE) {
    throw new Error("API_BASE not configured");
  }
  const res = await fetch(`${API_BASE.replace(/\/$/, "")}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function getRoles(): Promise<Role[]> {
  const res = await fetch("/api/roles");
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string; detail?: string }).detail ?? (err as { error?: string }).error ?? "Failed to fetch roles");
  }
  return res.json() as Promise<Role[]>;
}

export async function getRole(roleId: string): Promise<Role | null> {
  const res = await fetch(`/api/roles/${encodeURIComponent(roleId)}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string; detail?: string }).detail ?? (err as { error?: string }).error ?? "Failed to fetch role");
  }
  return res.json() as Promise<Role>;
}

/** 創建角色請求體（與後端 RoleCreate 對應，可傳 camelCase） */
export type RoleCreatePayload = {
  name: string;
  title?: string;
  city?: string;
  mood?: string;
  persona?: string;
  greeting?: string;
  description?: string;
  tags?: string[];
  script?: string[];
  avatar?: string;
  heroImage?: string;
};

export async function createRole(payload: RoleCreatePayload): Promise<Role> {
  const res = await fetch("/api/roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string; detail?: string }).detail ?? (err as { error?: string }).error ?? "Failed to create role");
  }
  return res.json() as Promise<Role>;
}

export async function updateRole(roleId: string, payload: RoleUpdatePayload): Promise<Role> {
  const res = await fetch(`/api/roles/${encodeURIComponent(roleId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string; detail?: string }).detail ?? (err as { error?: string }).error ?? "Failed to update role");
  }
  return res.json() as Promise<Role>;
}

export type WanSavedAsset = { url: string; path: string; bucket: string; contentType?: string };

export type WanImageResponse = {
  taskId: string;
  status: string;
  imageUrl: string;
  saved?: WanSavedAsset | null;
  prompt: string;
  model: string;
};

export type WanVideoResponse = {
  taskId: string;
  status: string;
  videoUrl: string;
  coverImageUrl?: string;
  saved?: WanSavedAsset | null;
  prompt: string;
  model: string;
  duration: number;
  resolution: string;
};

export async function wanGenerateImage(payload: {
  prompt: string;
  size?: string;
  negative_prompt?: string;
  role_id?: string;
  seed?: number;
  save?: boolean;
}): Promise<WanImageResponse> {
  return sendJson<WanImageResponse>("/ai/wan/image", payload, "POST");
}

export async function wanGenerateVideoFromImage(payload: {
  imageUrl: string;
  prompt?: string;
  duration?: number;
  resolution?: string;
  roleId?: string;
  save?: boolean;
}): Promise<WanVideoResponse> {
  const body = {
    image_url: payload.imageUrl,
    prompt: payload.prompt,
    duration: payload.duration,
    resolution: payload.resolution,
    role_id: payload.roleId,
    save: payload.save ?? false,
  };
  return sendJson<WanVideoResponse>("/ai/wan/video-from-image", body, "POST");
}

export async function wanSaveAsset(url: string, roleId?: string, kind?: string): Promise<WanSavedAsset> {
  const body = { url, role_id: roleId, kind };
  return sendJson<{ saved: WanSavedAsset }>("/ai/wan/save", body, "POST").then((r) => r.saved);
}

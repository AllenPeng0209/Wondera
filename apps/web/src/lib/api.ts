import { seedAchievements, seedChats, seedPosts, seedRoles, seedTasks } from './seeds';
import type { Achievement, ChatMessage, Post, Role, Task } from '@/types/content';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

async function fetchJson<T>(path: string): Promise<T | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function sendJson<T>(path: string, body: unknown, method: 'POST' | 'PATCH' = 'POST'): Promise<T | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getRoles(): Promise<Role[]> {
  return (await fetchJson<Role[]>('/roles')) ?? seedRoles;
}

export async function getPosts(): Promise<Post[]> {
  return (await fetchJson<Post[]>('/explore/posts')) ?? seedPosts;
}

export async function getChat(roleId: string): Promise<ChatMessage[]> {
  return seedChats[roleId] ?? [];
}

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

export async function updateRole(roleId: string, payload: RoleUpdatePayload): Promise<Role | null> {
  if (!roleId) return null;
  return sendJson<Role>(`/roles/${encodeURIComponent(roleId)}`, payload, 'PATCH');
}

export type ChatCompletionMessage = { role: 'user' | 'assistant'; content: string };

export async function postChat(
  roleId: string | null,
  rolePayload: { name: string; persona?: string; greeting?: string } | null,
  messages: ChatCompletionMessage[]
): Promise<{ content: string } | null> {
  if (!API_BASE || !messages.length) return null;
  try {
    const body: { role_id?: string; role?: Record<string, string>; messages: ChatCompletionMessage[] } = {
      messages: messages.slice(-20),
    };
    if (rolePayload) {
      body.role = {
        name: rolePayload.name,
        persona: rolePayload.persona ?? '',
        greeting: rolePayload.greeting ?? '',
      };
    } else if (roleId) {
      body.role_id = roleId;
    } else {
      return null;
    }
    const res = await fetch(`${API_BASE}/chat/completion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as { content: string };
  } catch {
    return null;
  }
}

export async function getTasks(): Promise<Task[]> {
  return seedTasks;
}

export async function getAchievements(): Promise<Achievement[]> {
  return seedAchievements;
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

export async function generateWanImage(payload: {
  prompt: string;
  size?: string;
  negative_prompt?: string;
  role_id?: string;
  seed?: number;
  save?: boolean;
}): Promise<WanImageResponse | null> {
  return sendJson<WanImageResponse>('/ai/wan/image', payload, 'POST');
}

export async function generateWanVideoFromImage(payload: {
  imageUrl: string;
  prompt?: string;
  duration?: number;
  resolution?: string;
  roleId?: string;
  save?: boolean;
}): Promise<WanVideoResponse | null> {
  const body = {
    image_url: payload.imageUrl,
    prompt: payload.prompt,
    duration: payload.duration,
    resolution: payload.resolution,
    role_id: payload.roleId,
    save: payload.save ?? false,
  };
  return sendJson<WanVideoResponse>('/ai/wan/video-from-image', body, 'POST');
}

export async function saveWanAsset(url: string, roleId?: string, kind?: string): Promise<WanSavedAsset | null> {
  if (!url) return null;
  const body = { url, role_id: roleId, kind };
  const res = await sendJson<{ saved: WanSavedAsset }>('/ai/wan/save', body, 'POST');
  return res?.saved ?? null;
}

export function formatCount(value?: number) {
  if (!value) return '0';
  if (value < 1000) return `${value}`;
  if (value < 10000) return `${(value / 1000).toFixed(1)}k`;
  return `${(value / 10000).toFixed(1)}w`;
}

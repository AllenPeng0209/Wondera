import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE;
const ADMIN_USER = process.env.ADMIN_USER ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "change_me";

function mapBackendToRole(row: Record<string, unknown>) {
  const status = row.status === "published" ? "已發佈" : "草稿";
  const updatedAt = row.updatedAt as string | undefined;
  let updated = "—";
  if (updatedAt) {
    try {
      const d = new Date(updatedAt);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffM = Math.floor(diffMs / 60000);
      if (diffM < 1) updated = "剛剛";
      else if (diffM < 60) updated = `${diffM} 分鐘前`;
      else updated = d.toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      updated = updatedAt;
    }
  }
  return {
    id: row.id,
    name: row.name,
    title: row.title ?? "",
    city: row.city ?? "",
    mood: row.mood ?? "",
    status,
    version: "—",
    latencyMs: 0,
    coverage: 0,
    updated,
    avatar: row.avatar ?? "",
    heroImage: row.heroImage ?? "",
    snippet: (row.description as string) ?? (row.greeting as string)?.slice(0, 80) ?? "",
    tags: (row.tags as string[]) ?? [],
    persona: row.persona ?? "",
    greeting: row.greeting ?? "",
    prompt: "",
    assets: [],
    travelNote: "",
    description: row.description,
    script: row.script,
  };
}

export async function GET() {
  if (!API_BASE) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_API_BASE or API_BASE not set" },
      { status: 500 }
    );
  }
  const url = `${API_BASE.replace(/\/$/, "")}/admin/roles?limit=200`;
  const auth = Buffer.from(`${ADMIN_USER}:${ADMIN_PASSWORD}`).toString("base64");
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Backend returned ${res.status}`, detail: text.slice(0, 200) },
        { status: res.status }
      );
    }
    const data = (await res.json()) as Record<string, unknown>[];
    const roles = data.map(mapBackendToRole);
    return NextResponse.json(roles);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to fetch roles", detail: message }, { status: 502 });
  }
}

/** 創建角色請求體：與後端 RoleCreate 對應，前端可傳 camelCase，此處轉 snake_case */
type CreateRoleBody = {
  name: string;
  title?: string;
  city?: string;
  mood?: string;
  persona?: string;
  greeting?: string;
  description?: string;
  tags?: string[];
  script?: string[];
  avatar_url?: string;
  hero_image_url?: string;
  avatar?: string;
  heroImage?: string;
};

export async function POST(request: Request) {
  if (!API_BASE) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_API_BASE or API_BASE not set" },
      { status: 500 }
    );
  }
  let body: CreateRoleBody;
  try {
    body = (await request.json()) as CreateRoleBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const payload = {
    name: body.name.trim(),
    title: body.title?.trim() || undefined,
    city: body.city?.trim() || undefined,
    mood: body.mood?.trim() || undefined,
    persona: body.persona?.trim() || undefined,
    greeting: body.greeting?.trim() || undefined,
    description: body.description?.trim() || undefined,
    tags: Array.isArray(body.tags) ? body.tags : undefined,
    script: Array.isArray(body.script) ? body.script : undefined,
    avatar_url: body.avatar_url?.trim() || body.avatar?.trim() || undefined,
    hero_image_url: body.hero_image_url?.trim() || body.heroImage?.trim() || undefined,
  };
  const url = `${API_BASE.replace(/\/$/, "")}/admin/roles`;
  const auth = Buffer.from(`${ADMIN_USER}:${ADMIN_PASSWORD}`).toString("base64");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Backend returned ${res.status}`, detail: text.slice(0, 300) },
        { status: res.status }
      );
    }
    const row = (await res.json()) as Record<string, unknown>;
    const role = mapBackendToRole(row);
    return NextResponse.json(role);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create role", detail: message }, { status: 502 });
  }
}

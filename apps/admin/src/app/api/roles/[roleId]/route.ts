import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE;
const ADMIN_USER = process.env.ADMIN_USER ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "change_me";

function getAuthHeader(): string {
  return "Basic " + Buffer.from(`${ADMIN_USER}:${ADMIN_PASSWORD}`).toString("base64");
}

function mapBackendToRole(row: Record<string, unknown>) {
  const status = row.status === "published" ? "已發佈" : "草稿";
  const updatedAt = row.updatedAt as string | undefined;
  let updated = "—";
  if (updatedAt) {
    try {
      const d = new Date(updatedAt);
      updated = d.toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      updated = updatedAt ?? "—";
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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  if (!API_BASE) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_API_BASE or API_BASE not set" },
      { status: 500 }
    );
  }
  const url = `${API_BASE.replace(/\/$/, "")}/roles/${encodeURIComponent(roleId)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }
      const text = await res.text();
      return NextResponse.json(
        { error: `Backend returned ${res.status}`, detail: text.slice(0, 200) },
        { status: res.status }
      );
    }
    const data = (await res.json()) as Record<string, unknown>;
    const role = mapBackendToRole(data);
    return NextResponse.json(role);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to fetch role", detail: message }, { status: 502 });
  }
}

/** 後端 RoleUpdate 格式：只送後端接受的欄位 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  if (!API_BASE) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_API_BASE or API_BASE not set" },
      { status: 500 }
    );
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const url = `${API_BASE.replace(/\/$/, "")}/admin/roles/${encodeURIComponent(roleId)}`;
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Backend returned ${res.status}`, detail: text.slice(0, 300) },
        { status: res.status }
      );
    }
    const data = (await res.json()) as Record<string, unknown>;
    const role = mapBackendToRole(data);
    return NextResponse.json(role);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to update role", detail: message }, { status: 502 });
  }
}

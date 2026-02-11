"use client";

import { Badge, Card, SectionHeader } from "@/components/ui";
import { getRoles } from "@/lib/api";
import { roles as seedRoles } from "@/lib/mock";
import { readRoles, writeRoles } from "@/lib/role-store";
import { Role } from "@/lib/types";
import { ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
      setRoles(readRoles().length ? readRoles() : seedRoles);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const persist = (next: Role[]) => {
    setRoles(next);
    writeRoles(next);
  };

  const deleteRole = (id: string) => {
    persist(roles.filter((r) => r.id !== id));
  };

  const markPublished = (id: string) => {
    persist(roles.map((r) => (r.id === id ? { ...r, status: "已發佈", updated: "剛剛" } : r)));
  };

  const markRollback = (id: string) => {
    persist(roles.map((r) => (r.id === id ? { ...r, status: "可回滾", updated: "剛剛" } : r)));
  };

  const avgCoverage = useMemo(() => {
    if (!roles.length) return 0;
    const sum = roles.reduce((acc, r) => acc + (r.coverage ?? 0), 0);
    return Math.round((sum / roles.length) * 100);
  }, [roles]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {error}，目前顯示本地快取或 mock 資料。請確認後端已啟動且 .env 中 ADMIN_USER / ADMIN_PASSWORD 正確。
        </div>
      )}
      {loading && roles.length === 0 && (
        <p className="text-sm text-muted">載入角色中…</p>
      )}
      <SectionHeader
        title="角色管理"
        subtitle="管理員自行新增 / 刪除 / 修改角色，點擊卡片進入完整配置。"
        icon={<Plus className="h-5 w-5 text-accent" />}
        actions={
          <button
            type="button"
            onClick={() => router.push("/roles/new")}
            className="rounded-lg bg-accent/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-glow hover:opacity-90"
          >
            新增角色
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 text-sm text-muted">
        <span>角色數：{roles.length}</span>
        <span>平均測試覆蓋率：{avgCoverage}%</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {roles.map((r) => (
          <Card key={r.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-semibold text-slate-50">{r.name}</p>
                <p className="text-xs text-muted">
                  {r.title} · {r.city}
                </p>
              </div>
              <Badge tone={r.status === "已發佈" ? "accent" : r.status === "草稿" ? "amber" : "danger"}>{r.status}</Badge>
            </div>

            <p className="text-sm text-muted">{r.snippet}</p>
            {(r.version != null || r.latencyMs != null || r.coverage != null) && (
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                {r.version != null && <span className="rounded-full bg-panel px-2 py-1">版本 {r.version}</span>}
                {r.latencyMs != null && <span className="rounded-full bg-panel px-2 py-1">Latency p95: {r.latencyMs} ms</span>}
                {r.coverage != null && <span className="rounded-full bg-panel px-2 py-1">覆蓋: {Math.round((r.coverage ?? 0) * 100)}%</span>}
              </div>
            )}

            {r.tags && r.tags.length ? (
              <div className="flex flex-wrap gap-1 text-xs text-muted">
                {r.tags.map((tag) => (
                  <span key={tag} className="rounded-md border border-panel-border px-2 py-0.5">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-auto flex flex-wrap gap-2 text-sm">
              <button
                className="flex items-center gap-1 rounded-lg bg-accent/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-glow"
                onClick={() => router.push(`/roles/${r.id}`)}
              >
                管理
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                className="rounded-lg border border-panel-border px-3 py-2 text-xs text-slate-100 hover:border-amber/60"
                onClick={() => markPublished(r.id)}
              >
                發佈
              </button>
              <button
                className="rounded-lg border border-panel-border px-3 py-2 text-xs text-slate-100 hover:border-danger/60"
                onClick={() => markRollback(r.id)}
              >
                回滾
              </button>
              <button
                className="ml-auto flex items-center gap-1 rounded-lg border border-danger/60 px-3 py-2 text-xs text-danger hover:bg-danger/10"
                onClick={() => deleteRole(r.id)}
              >
                <Trash2 className="h-4 w-4" /> 刪除
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}


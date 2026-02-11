"use client";

import { Badge, Card, SectionHeader } from "@/components/ui";
import { dataOps } from "@/lib/mock";
import { Database, Play, RefreshCcw } from "lucide-react";
import { useState } from "react";

export default function DataPage() {
  const [ops, setOps] = useState(dataOps);
  const dryRun = (id: string) => {
    setOps((prev) => prev.map((op) => (op.id === id ? { ...op, status: "dryrun-ok" } : op)));
  };
  const commit = (id: string) => {
    setOps((prev) => prev.map((op) => (op.id === id ? { ...op, status: "pending", detail: op.detail + " · 已提交" } : op)));
  };
  const rollback = (id: string) => {
    setOps((prev) => prev.map((op) => (op.id === id ? { ...op, status: "pending", detail: op.detail + " · 回滾排程" } : op)));
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="後端資料編輯"
        subtitle="乾跑 → diff → 提交 → 快照回滾"
        icon={<Database className="h-5 w-5 text-amber" />}
        actions={
          <button className="rounded-lg bg-accent/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow-glow">
            新增批次操作
          </button>
        }
      />

      <div className="space-y-3">
        {ops.map((op) => (
          <Card key={op.id}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-50">
                {op.table} · {op.op}
              </p>
              <Badge tone="muted">{op.impact}</Badge>
            </div>
            <p className="text-xs text-muted">{op.detail}</p>
            <div className="mt-2 flex gap-2 text-xs text-muted">
              <button
                className="rounded-lg border border-panel-border px-3 py-1 text-slate-100 hover:border-accent/60"
                onClick={() => dryRun(op.id)}
              >
                乾跑
              </button>
              <button
                className="rounded-lg border border-panel-border px-3 py-1 text-slate-100 hover:border-amber/60"
                onClick={() => commit(op.id)}
              >
                提交
              </button>
              <button
                className="rounded-lg border border-panel-border px-3 py-1 text-slate-100 hover:border-danger/60"
                onClick={() => rollback(op.id)}
              >
                回滾
              </button>
            </div>
            {op.status === "dryrun-ok" ? (
              <div className="mt-2 rounded-lg border border-accent/50 bg-accent/10 px-3 py-2 text-xs text-slate-50">
                乾跑成功，快照已建立，可安全提交。
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}

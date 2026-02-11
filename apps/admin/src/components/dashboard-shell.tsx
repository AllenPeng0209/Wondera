"use client";

import { Sidebar } from "./sidebar";
import { Badge } from "./ui";
import { Menu } from "lucide-react";
import { useState } from "react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ink">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <main className="flex min-h-screen flex-col md:pl-80">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-1 min-h-0 flex-col gap-6 px-4 py-6 sm:px-8">
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                className="md:hidden rounded-lg border border-panel-border bg-panel px-3 py-2 text-slate-100"
                onClick={() => setOpen((o) => !o)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted">SUPER ADMIN</p>
                <h1 className="text-3xl font-semibold text-slate-50">控制台</h1>
                <p className="text-sm text-muted">集中管理角色 CRUD、提示詞與素材的調適流程。</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge tone="accent">Audit 100%</Badge>
              <Badge tone="amber">SLA &lt; 2 min</Badge>
              <Badge tone="info">Test coverage 90%</Badge>
            </div>
          </header>
          <div className="flex min-h-0 flex-1 flex-col">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}


"use client";

/* eslint-disable react/jsx-key */

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const navItems = [
  { href: "/roles", label: "角色管理", hint: "角色 / Prompt / 素材 / 預覽", icon: <ShieldCheck className="h-4 w-4" /> },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className={cx(
        "fixed inset-y-0 left-0 z-30 w-72 transform bg-panel-strong/95 px-4 py-6 shadow-2xl backdrop-blur transition-all",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="mb-6">
        <p className="text-sm text-muted">Wondera</p>
        <p className="text-lg font-semibold text-slate-50">控制台</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm",
                active
                  ? "border-accent/70 bg-accent/10 text-slate-50 shadow-glow"
                  : "border-panel-border/70 bg-panel text-muted hover:border-accent/40 hover:text-slate-100"
              )}
              onClick={onClose}
            >
              <span className="flex items-center gap-3">
                <span className={cx("rounded-lg p-2", active ? "bg-accent/15 text-accent" : "bg-panel text-muted")}>{item.icon}</span>
                <div className="flex flex-col">
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-xs text-muted">{item.hint}</span>
                </div>
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

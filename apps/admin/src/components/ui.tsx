import clsx from "clsx";
import { ReactNode } from "react";
import { BadgeTone } from "../lib/types";

const toneMap: Record<BadgeTone, string> = {
  accent: "border-accent/60 bg-accent/10 text-accent",
  amber: "border-amber/60 bg-amber/10 text-amber",
  danger: "border-danger/60 bg-danger/10 text-danger",
  muted: "border-panel-border bg-panel/70 text-muted",
  info: "border-blue-400/60 bg-blue-400/10 text-blue-100",
};

export const cx = clsx;

export function Badge({ tone = "muted", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneMap[tone]
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-xl border border-panel-border/80 bg-panel/80 p-4 shadow-inner-1", className)}>
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-panel-border/80 pb-4">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h2 className="text-xl font-semibold text-slate-50">{title}</h2>
          {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {actions}
    </div>
  );
}

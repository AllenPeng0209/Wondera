import { Badge, Card, SectionHeader } from "@/components/ui";
import { audits, statusTone } from "@/lib/mock";
import { Activity } from "lucide-react";

export default function LogsPage() {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="審計 / 日誌"
        subtitle="監控最近變更 · 匯出 CSV/JSON"
        icon={<Activity className="h-5 w-5 text-amber" />}
        actions={<button className="rounded-lg border border-panel-border px-3 py-2 text-xs text-slate-100 hover:border-accent/60">匯出</button>}
      />
      <div className="space-y-2 text-sm">
        {audits.map((log) => (
          <Card key={log.id} className="px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted">{log.time}</p>
                <p className="font-semibold text-slate-50">{log.action}</p>
                <p className="text-xs text-muted">{log.entity}</p>
              </div>
              <Badge tone={statusTone[log.status]}>{log.status.toUpperCase()}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export type RoleStatus = "已發佈" | "草稿" | "可回滾";

export type BadgeTone = "accent" | "amber" | "danger" | "muted" | "info";

export interface Role {
  id: string;
  name: string;
  title: string;
  city: string;
  mood: string;
  status: RoleStatus;
  version?: string;
  latencyMs?: number;
  coverage?: number; // 0-1
  updated: string;
  avatar: string;
  heroImage: string;
  snippet?: string;
  tags?: string[];
  persona?: string;
  greeting?: string;
  prompt?: string;
  assets?: string[];
  travelNote?: string;
  description?: string;
  script?: string[] | unknown;
}

export interface PromptVersion {
  id: string;
  role: string;
  variant: string;
  summary: string;
  tests: string;
  status: "prod" | "draft" | "canary";
}

export interface CloudPage {
  id: string;
  title: string;
  blocks: string[];
  staging: string;
  rights: string;
  status: "draft" | "staging" | "published";
}

export type AssetStatus = "即將到期" | "正常" | "需替換";

export interface AssetItem {
  id: string;
  status: AssetStatus;
  rights: string;
  usage: number;
  kind: "image" | "video" | "audio" | "doc";
}

export interface DataOp {
  id: string;
  table: string;
  op: "update" | "upsert" | "delete";
  impact: string;
  detail: string;
  status: "pending" | "dryrun-ok" | "blocked";
}

export interface AuditLog {
  id: string;
  time: string;
  action: string;
  entity: string;
  status: "ok" | "warn" | "blocked";
}

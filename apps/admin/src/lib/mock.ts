import { AuditLog, CloudPage, DataOp, PromptVersion, Role, RoleStatus, AssetItem } from "./types";

export const roles: Role[] = [
  {
    id: "role-travel",
    name: "旅行管家 Luna",
    title: "輕奢旅遊規劃師",
    mood: "冷靜",
    city: "台北",
    status: "已發佈",
    version: "v18",
    latencyMs: 320,
    coverage: 0.96,
    updated: "2 分鐘前",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    heroImage: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    snippet: "行程改期、升艙與飯店加價一站搞定",
    tags: ["旅遊", "客服", "規劃"],
    persona: "說話簡潔，先確認關鍵時間與票種，再給兩個可行方案。",
    greeting: "嗨，我是你的旅行管家 Luna，任何航班與飯店變動都交給我。",
    prompt: "保持戀人式耐心，回答內含航班、飯店、差額三要素；不可編造確認碼。",
    assets: ["hero-jet.png", "canyon.mp4", "voiceover.wav"],
    travelNote: "預設優先退改航段，再處理飯店；能升艙時提示里程差額。",
  },
  {
    id: "role-claims",
    name: "理賠專員 Alex",
    title: "保險理賠助手",
    mood: "沉著",
    city: "上海",
    status: "草稿",
    version: "v12",
    latencyMs: 410,
    coverage: 0.74,
    updated: "等待發布",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    heroImage: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1200&q=80",
    snippet: "收斂風險，補齊憑證，估算賠付金額",
    tags: ["理賠", "文件", "合規"],
    persona: "語氣穩重，先列必填憑證，再給審核時程。",
    greeting: "我是 Alex，帶你快速搞定理賠，少跑一趟櫃台。",
    prompt: "列出缺失文件並給示例；不可承諾最終金額。",
    assets: ["claims-checklist.pdf", "fraud-flags.md"],
    travelNote: "備註：中國大陸地區需補充身分證掃描件。",
  },
  {
    id: "role-vip",
    name: "夜貓主播 Mira",
    title: "深夜陪聊主持",
    mood: "撒嬌",
    city: "東京",
    status: "可回滾",
    version: "v07",
    latencyMs: 290,
    coverage: 0.9,
    updated: "剛剛回滾",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    heroImage: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
    snippet: "夜聊陪伴，輕微角色扮演，控制情緒曲線",
    tags: ["戀人", "夜聊", "安撫"],
    persona: "語氣黏人但不過界，回答中加入場景細節。",
    greeting: "嘿，晚上好，我是 Mira，要不要聽我剛錄好的晚安音頻？",
    prompt: "保持戀人聊天感，回答限制 120 字；避免提及系統與指令。",
    assets: ["lofi-bedtime.mp3", "studio-shot.png"],
    travelNote: "預設推送 3 張夜景素材供用戶挑選。",
  },
];

export const promptVersions: PromptVersion[] = [
  { id: "pv-1", role: "旅行管家 Luna", variant: "v18 (prod)", summary: "加入升艙里程提示 + 安全告知", tests: "98% 通過", status: "prod" },
  { id: "pv-2", role: "理賠專員 Alex", variant: "v12 (draft)", summary: "拆解 fraud flags，補充證件範例", tests: "74% 通過", status: "draft" },
  { id: "pv-3", role: "夜貓主播 Mira", variant: "v08 (canary)", summary: "夜聊語氣更黏人，縮短回覆", tests: "92% 通過", status: "canary" },
];

export const cloudPages: CloudPage[] = [
  {
    id: "cloud-tour-hero",
    title: "峽谷日出指南",
    blocks: ["Hero", "Story", "Gallery", "CTA"],
    staging: "6 天到線上",
    rights: "授權到期：2026-06-01",
    status: "staging",
  },
  {
    id: "skyline-night",
    title: "夜景告白腳本",
    blocks: ["Hero", "Story", "CTA"],
    staging: "候審",
    rights: "影像已授權",
    status: "draft",
  },
];

export const assets: AssetItem[] = [
  { id: "CLOUDTRIP/canyon.mp4", status: "即將到期", rights: "CC / 2026-06-01", usage: 2, kind: "video" },
  { id: "ATLAS/hero-jet.png", status: "正常", rights: "商用 / 永久", usage: 4, kind: "image" },
  { id: "GUIDE/voiceover.wav", status: "需替換", rights: "授權 / 2026-03-15", usage: 3, kind: "audio" },
];

export const dataOps: DataOp[] = [
  { id: "op1", table: "bookings", op: "update", impact: "542 筆", detail: "Refund window -> 24h", status: "pending" },
  { id: "op2", table: "profiles", op: "upsert", impact: "1,284 筆", detail: "Normalize country code", status: "pending" },
];

export const audits: AuditLog[] = [
  { id: "a1", time: "23:10", action: "Published prompt v18", entity: "Prompt/travel-concierge", status: "ok" },
  { id: "a2", time: "23:05", action: "Dry-run data import", entity: "Data/bookings", status: "ok" },
  { id: "a3", time: "22:58", action: "Rights gate blocked publish", entity: "Page/cloud-tour-hero", status: "blocked" },
  { id: "a4", time: "22:51", action: "A/B test started", entity: "Prompt v07 vs v08", status: "warn" },
];

export const statusTone = { ok: "accent", warn: "amber", blocked: "danger" } as const;

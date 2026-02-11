"use client";

import { Badge, Card, SectionHeader } from "@/components/ui";
import {
  getRole,
  updateRole,
  type RoleUpdatePayload,
  wanGenerateImage,
  wanGenerateVideoFromImage,
  wanSaveAsset,
  type WanImageResponse,
  type WanVideoResponse,
} from "@/lib/api";
import { roles as seedRoles } from "@/lib/mock";
import { readRoles, removeRole, upsertRole } from "@/lib/role-store";
import { BadgeTone, Role, RoleStatus } from "@/lib/types";
import { ArrowLeft, Eye, Loader2, Save, Star, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const STATUS_OPTIONS: RoleStatus[] = ["已發佈", "草稿", "可回滾"];

const defaultImagePrompt = (name?: string) => `帥氣正面男生肖像，高清寫實，電影感柔光，${name ?? "角色"}的臉部清晰。`;
const defaultVideoPrompt =
  "男主角置身城市夜景，手持咖啡走向鏡頭，穩定跟拍，光影變化自然，最後對鏡頭點頭。";

type ChatMsg = { sender: "user" | "ai"; text: string };
type AssetItem = { url: string; kind: "image" | "video" };

export default function RoleDetailPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [tagsInput, setTagsInput] = useState("");
  const [assetsInput, setAssetsInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"dialog" | "assets">("assets");
  const [imagePrompt, setImagePrompt] = useState(defaultImagePrompt());
  const [videoPrompt, setVideoPrompt] = useState(defaultVideoPrompt);
  const [textDraft, setTextDraft] = useState("想要的劇情/氛圍先寫在這裡，方便後面文生圖、圖生視頻直接複用。");
  const [imageResult, setImageResult] = useState<WanImageResponse | null>(null);
  const [videoResult, setVideoResult] = useState<WanVideoResponse | null>(null);
  const [assetMessage, setAssetMessage] = useState<string | null>(null);
  const [assetLoading, setAssetLoading] = useState<"image" | "video" | "saveImage" | "saveVideo" | null>(null);
  const [testSending, setTestSending] = useState(false);
  const [addAssetUrl, setAddAssetUrl] = useState("");
  const [baseImageUrl, setBaseImageUrl] = useState<string | null>(null);

  const loadRole = useCallback(
    async (id: string) => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getRole(id);
        const found = data ?? readRoles().find((r) => r.id === id) ?? seedRoles.find((r) => r.id === id) ?? null;
        setRole(found);
        setTagsInput((found?.tags ?? []).join(", "));
        setAssetsInput((found?.assets ?? []).join(", "));
        setImagePrompt(defaultImagePrompt(found?.name));
        setVideoPrompt(defaultVideoPrompt);
        setBaseImageUrl(found?.heroImage || null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadRole(roleId ?? "");
  }, [roleId, loadRole]);

  const update = <K extends keyof Role>(key: K, value: Role[K]) => {
    setRole((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const parseList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const assets = useMemo<AssetItem[]>(() => {
    return parseList(assetsInput).map((url) => {
      const lower = url.toLowerCase();
      const kind: AssetItem["kind"] = lower.match(/\.(mp4|mov|webm|m4v)$/) ? "video" : "image";
      return { url, kind };
    });
  }, [assetsInput]);

  const imageAssets = assets.filter((a) => a.kind === "image");
  const faceModelUrl = useMemo(() => {
    return baseImageUrl || role?.heroImage || imageAssets[0]?.url || null;
  }, [role?.heroImage, imageAssets, baseImageUrl]);

  useEffect(() => {
    if (!baseImageUrl && faceModelUrl) setBaseImageUrl(faceModelUrl);
  }, [baseImageUrl, faceModelUrl]);

  const statusTone = (status?: RoleStatus | string): BadgeTone => {
    if (status === "已發佈") return "accent";
    if (status === "草稿") return "amber";
    return "danger";
  };

  const save = async () => {
    if (!role) return;
    setSaving(true);
    const tags = parseList(tagsInput);
    const nextRole = { ...role, tags, assets: parseList(assetsInput) };
    const statusMap: Record<string, string> = { "已發佈": "published", "草稿": "draft", "可回滾": "draft" };
    const payload: RoleUpdatePayload = {
      name: nextRole.name,
      avatar_url: nextRole.avatar || undefined,
      hero_image_url: nextRole.heroImage || undefined,
      persona: nextRole.persona || undefined,
      mood: nextRole.mood || undefined,
      greeting: nextRole.greeting || undefined,
      title: nextRole.title || undefined,
      city: nextRole.city || undefined,
      description: nextRole.description ?? nextRole.snippet ?? undefined,
      tags: tags.length ? tags : undefined,
      script: Array.isArray(nextRole.script) ? nextRole.script : undefined,
      status: statusMap[nextRole.status ?? ""] ?? nextRole.status,
    };
    try {
      const updated = await updateRole(role.id, payload);
      setRole({ ...nextRole, ...updated });
      upsertRole({ ...nextRole, ...updated });
    } catch (e) {
      upsertRole(nextRole);
      setRole(nextRole);
      alert("遠端暫時無法保存，已先寫入本地。");
    }
    setSaving(false);
  };

  const splitReplyIntoChunks = (content: string): string[] => {
    const normalized = (content || "").replace(/\r/g, "").trim();
    if (!normalized) return [];
    if (normalized.includes("\n")) {
      return normalized.split("\n").filter((line) => line.trim());
    }
    return [normalized];
  };

  const sendTestMessage = async () => {
    if (!role || !chatInput.trim()) return;
    const text = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: "user", text }]);
    setChatInput("");
    setTestSending(true);
    const apiBase = process.env.NEXT_PUBLIC_API_BASE;
    const messages = [
      ...chatMessages.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })),
      { role: "user" as const, content: text },
    ];
    const body = {
      role: { name: role.name, persona: role.persona ?? "", greeting: role.greeting ?? "" },
      messages,
    };
    let aiContent = "（本地提示：未配置 /chat/completion，可用真實後端時再測試）";
    try {
      if (apiBase) {
        const res = await fetch(`${apiBase.replace(/\/$/, "")}/chat/completion`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = (await res.json()) as { content?: string };
          aiContent = (data.content ?? "").trim() || aiContent;
        }
      }
    } catch {
      aiContent = "（請確認 CORS / API Key 配置後重試）";
    }
    const chunks = splitReplyIntoChunks(aiContent);
    const aiMessages = chunks.length
      ? chunks.map((chunk) => ({ sender: "ai" as const, text: chunk }))
      : [{ sender: "ai" as const, text: aiContent }];
    setChatMessages((prev) => [...prev, ...aiMessages]);
    setTestSending(false);
  };

  const addAssetToList = (url: string, kind: AssetItem["kind"]) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const list = parseList(assetsInput);
    if (!list.includes(trimmed)) {
      list.unshift(trimmed);
    }
    setAssetsInput(list.join(", "));
    if (kind === "image" && !baseImageUrl) {
      setBaseImageUrl(trimmed);
      setRole((prev) => (prev ? { ...prev, heroImage: prev.heroImage || trimmed } : prev));
    }
    setAssetMessage(`${kind === "image" ? "圖像" : "視頻"}已加入素材庫`);
  };

  const removeAsset = (url: string) => {
    const next = parseList(assetsInput).filter((item) => item !== url);
    setAssetsInput(next.join(", "));
    if (baseImageUrl === url) {
      setBaseImageUrl(next.find((item) => !item.match(/\.(mp4|mov|webm|m4v)$/)) ?? null);
    }
  };

  const runImage = async () => {
    if (!imagePrompt.trim()) {
      setAssetMessage("請先填寫文生圖提示詞。");
      return;
    }
    setAssetMessage(null);
    setAssetLoading("image");
    try {
      const res = await wanGenerateImage({
        prompt: `${textDraft ? `${textDraft}\n` : ""}${imagePrompt}`.trim(),
        role_id: role?.id,
        save: false,
      });
      setImageResult(res);
      if (res.imageUrl) {
        setBaseImageUrl((prev) => prev ?? res.imageUrl);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "生成失敗，請稍後重試。";
      setAssetMessage(message);
    } finally {
      setAssetLoading(null);
    }
  };

  const runVideo = async () => {
    const sourceImage = imageResult?.imageUrl || baseImageUrl || faceModelUrl || imageAssets[0]?.url;
    if (!sourceImage) {
      setAssetMessage("請先準備臉模圖片（元素材），再進行圖生視頻。");
      return;
    }
    setAssetMessage(null);
    setAssetLoading("video");
    try {
      const res = await wanGenerateVideoFromImage({
        imageUrl: sourceImage,
        prompt: `${textDraft ? `${textDraft}\n` : ""}${videoPrompt}`.trim(),
        roleId: role?.id,
        save: false,
      });
      setVideoResult(res);
    } catch (e) {
      const message = e instanceof Error ? e.message : "生成視頻失敗，請稍後重試。";
      setAssetMessage(message);
    } finally {
      setAssetLoading(null);
    }
  };

  const saveImageAsset = async () => {
    if (!imageResult?.imageUrl) {
      setAssetMessage("還沒有可保存的圖像。");
      return;
    }
    setAssetLoading("saveImage");
    try {
      const saved = await wanSaveAsset(imageResult.imageUrl, role?.id, "image");
      const finalUrl = saved?.url ?? imageResult.imageUrl;
      addAssetToList(finalUrl, "image");
      setAssetMessage("圖像已保存並加入素材庫。");
    } catch (e) {
      const message = e instanceof Error ? e.message : "保存失敗，請稍後重試。";
      setAssetMessage(message);
    } finally {
      setAssetLoading(null);
    }
  };

  const saveVideoAsset = async () => {
    if (!videoResult?.videoUrl) {
      setAssetMessage("還沒有可保存的視頻。");
      return;
    }
    setAssetLoading("saveVideo");
    try {
      const saved = await wanSaveAsset(videoResult.videoUrl, role?.id, "video");
      const finalUrl = saved?.url ?? videoResult.videoUrl;
      addAssetToList(finalUrl, "video");
      setAssetMessage("視頻已保存並加入素材庫。");
    } catch (e) {
      const message = e instanceof Error ? e.message : "保存失敗，請稍後重試。";
      setAssetMessage(message);
    } finally {
      setAssetLoading(null);
    }
  };

  const deleteAndBack = () => {
    if (!role) return;
    removeRole(role.id);
    router.push("/roles");
  };

  const preview = (url: string) => {
    if (typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const renderAssetGallery = () => (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-50">素材庫</p>
          <p className="text-xs text-muted">所有圖片與視頻集中在這裡，方便管理與復用。</p>
        </div>
        <Badge tone="info">{assets.length} 項</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {assets.map((asset) => (
          <div key={asset.url} className="rounded-lg border border-panel-border bg-panel p-3">
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="truncate">{asset.url}</span>
              <Badge tone={asset.kind === "image" ? "accent" : "amber"}>{asset.kind === "image" ? "圖片" : "視頻"}</Badge>
            </div>
            <div className="mt-2 overflow-hidden rounded-md border border-panel-border bg-black/40">
              {asset.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.url} alt="asset" className="h-40 w-full object-cover" />
              ) : (
                <video src={asset.url} controls className="h-40 w-full object-cover" />
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <button
                className="flex items-center gap-1 rounded border border-panel-border px-2 py-1 text-slate-100 hover:border-accent/60"
                onClick={() => preview(asset.url)}
              >
                <Eye className="h-4 w-4" /> 預覽
              </button>
              {asset.kind === "image" && (
                <button
                  className="flex items-center gap-1 rounded border border-accent/60 px-2 py-1 text-accent hover:bg-accent/10"
                  onClick={() => {
                    setBaseImageUrl(asset.url);
                    update("heroImage", asset.url as Role["heroImage"]);
                  }}
                >
                  <Star className="h-4 w-4" /> 設為臉模
                </button>
              )}
              <button
                className="flex items-center gap-1 rounded border border-danger/60 px-2 py-1 text-danger hover:bg-danger/10"
                onClick={() => removeAsset(asset.url)}
              >
                <Trash2 className="h-4 w-4" /> 移除
              </button>
            </div>
          </div>
        ))}
        {assets.length === 0 && <p className="text-xs text-muted">暫無素材，請先生成或添加。</p>}
      </div>
    </Card>
  );

  const renderFaceModelCard = () => (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-50">元素材 · 臉模</p>
          <p className="text-xs text-muted">所有文生圖 / 圖生視頻均基於臉模，保持人物一致性。</p>
        </div>
        <Badge tone={faceModelUrl ? "accent" : "danger"}>{faceModelUrl ? "已就緒" : "待準備"}</Badge>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] text-muted">臉模 URL</label>
        <div className="flex gap-2">
          <input
            value={baseImageUrl ?? ""}
            onChange={(e) => setBaseImageUrl(e.target.value)}
            placeholder="先輸入或從素材庫點『設為臉模』"
            className="flex-1 rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
          />
          <button
            className="rounded-lg border border-panel-border px-3 py-1.5 text-xs text-slate-100 hover:border-accent/60"
            onClick={() => baseImageUrl && addAssetToList(baseImageUrl, "image")}
            disabled={!baseImageUrl}
          >
            入庫
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-panel-border bg-black/40">
        {faceModelUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={faceModelUrl} alt="face model" className="h-52 w-full object-cover" />
        ) : (
          <div className="flex h-52 items-center justify-center text-xs text-muted">尚未設定臉模</div>
        )}
      </div>
      <p className="text-[11px] text-muted">提示：如果當前角色沒有臉模，先生成一張帥哥正臉圖，保存後設為臉模。</p>
    </Card>
  );

  const renderLibraryCard = () => (
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-sm font-semibold text-slate-50">素材庫操作</p>
      <label className="flex flex-col gap-1 text-[10px] text-muted">
        新增素材 URL
        <input
          value={addAssetUrl}
          onChange={(e) => setAddAssetUrl(e.target.value)}
          placeholder="貼上已有圖片/視頻鏈接"
          className="rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-accent/90 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-glow disabled:opacity-60"
          onClick={() => {
            addAssetToList(addAssetUrl, addAssetUrl.toLowerCase().match(/\.(mp4|mov|webm|m4v)$/) ? "video" : "image");
            setAddAssetUrl("");
          }}
          disabled={!addAssetUrl.trim()}
        >
          加入素材庫
        </button>
        <button
          className="rounded-lg border border-panel-border px-3 py-1.5 text-xs text-slate-100 hover:border-accent/60 disabled:opacity-60"
          onClick={() => {
            setBaseImageUrl(addAssetUrl);
            update("heroImage", addAssetUrl as Role["heroImage"]);
          }}
          disabled={!addAssetUrl.trim()}
        >
          設為臉模
        </button>
      </div>
      <label className="flex flex-col gap-1 text-[10px] text-muted">
        目前素材列表（逗號分隔可手動編輯）
        <textarea
          value={assetsInput}
          onChange={(e) => setAssetsInput(e.target.value)}
          className="min-h-[80px] rounded border border-panel-border bg-panel p-2 text-xs text-slate-50 placeholder:text-muted resize-y"
        />
      </label>
    </Card>
  );

  const renderAssetsTab = () => (
    <div className="grid w-full gap-4 xl:grid-cols-3">
      <div className="flex flex-col gap-4">
        {renderFaceModelCard()}
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm font-semibold text-slate-50">文生（劇情草稿）</p>
          <p className="text-xs text-muted">先寫好文字草稿，文生圖/圖生視頻會自動拼接這段內容。</p>
          <textarea
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            className="min-h-[120px] rounded border border-panel-border bg-panel p-2 text-xs text-slate-50 placeholder:text-muted resize-y"
          />
        </Card>
        {renderLibraryCard()}
      </div>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-50">文生圖</p>
            {assetLoading === "image" && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
          </div>
          <textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            className="min-h-[140px] rounded border border-panel-border bg-panel p-2 text-xs text-slate-50 placeholder:text-muted resize-y"
          />
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              className="rounded-lg bg-accent/90 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-glow disabled:opacity-60"
              onClick={runImage}
              disabled={assetLoading === "image"}
            >
              生成帥哥圖
            </button>
            <button
              className="rounded-lg border border-panel-border px-3 py-1.5 text-xs text-slate-100 hover:border-accent/60 disabled:opacity-60"
              onClick={saveImageAsset}
              disabled={assetLoading !== null || !imageResult?.imageUrl}
            >
              <Save className="mr-1 inline h-4 w-4" />
              保存到素材
            </button>
          </div>
          {imageResult?.imageUrl && (
            <div className="overflow-hidden rounded-lg border border-panel-border bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageResult.imageUrl} alt="生成圖" className="h-60 w-full object-cover" />
            </div>
          )}
          <p className="text-[11px] text-muted">默認會使用臉模保持人臉穩定，可替換提示詞調整場景。</p>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-50">圖生視頻</p>
            {assetLoading === "video" && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
          </div>
          <p className="text-[11px] text-muted">
            會優先使用最新生成的圖，否則使用臉模。確保臉模穩定後再生成視頻。
          </p>
          <textarea
            value={videoPrompt}
            onChange={(e) => setVideoPrompt(e.target.value)}
            className="min-h-[120px] rounded border border-panel-border bg-panel p-2 text-xs text-slate-50 placeholder:text-muted resize-y"
          />
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              className="rounded-lg bg-accent/90 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-glow disabled:opacity-60"
              onClick={runVideo}
              disabled={assetLoading === "video"}
            >
              生成視頻
            </button>
            <button
              className="rounded-lg border border-panel-border px-3 py-1.5 text-xs text-slate-100 hover:border-accent/60 disabled:opacity-60"
              onClick={saveVideoAsset}
              disabled={assetLoading !== null || !videoResult?.videoUrl}
            >
              <Save className="mr-1 inline h-4 w-4" />
              保存到素材
            </button>
          </div>
          {videoResult?.videoUrl && (
            <div className="overflow-hidden rounded-lg border border-panel-border bg-black/40">
              <video src={videoResult.videoUrl} controls className="h-60 w-full object-cover" />
            </div>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        {renderAssetGallery()}
        {assetMessage && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{assetMessage}</p>
        )}
      </div>
    </div>
  );

  const renderDialogTab = () => (
    <div className="grid w-full gap-4 xl:grid-cols-3">
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm font-semibold text-slate-50">基礎信息</p>
        <label className="flex flex-col gap-1 text-[10px] text-muted">
          名稱
          <input
            value={role?.name ?? ""}
            onChange={(e) => update("name", e.target.value as Role["name"])}
            className="rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-muted">
          標題 / 身份
          <input
            value={role?.title ?? ""}
            onChange={(e) => update("title", e.target.value as Role["title"])}
            className="rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-muted">
          城市
          <input
            value={role?.city ?? ""}
            onChange={(e) => update("city", e.target.value as Role["city"])}
            className="rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-muted">
          心情 / 風格
          <input
            value={role?.mood ?? ""}
            onChange={(e) => update("mood", e.target.value as Role["mood"])}
            className="rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-muted">
          狀態
          <select
            value={role?.status ?? STATUS_OPTIONS[0]}
            onChange={(e) => update("status", e.target.value as RoleStatus)}
            className="rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-muted">
          標籤（逗號分隔）
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-muted">
          概要 / 一句話介紹
          <textarea
            value={role?.snippet ?? ""}
            onChange={(e) => update("snippet", e.target.value as Role["snippet"])}
            className="min-h-[80px] rounded border border-panel-border bg-panel p-2 text-xs text-slate-50 placeholder:text-muted resize-y"
          />
        </label>
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm font-semibold text-slate-50">Persona & Prompt</p>
        <label className="flex flex-col gap-1 text-[10px] text-muted">
          Persona
          <textarea
            value={role?.persona ?? ""}
            onChange={(e) => update("persona", e.target.value as Role["persona"])}
            className="min-h-[100px] rounded border border-panel-border bg-panel p-2 text-xs text-slate-50 placeholder:text-muted resize-y"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-muted">
          Greeting / 開場
          <textarea
            value={role?.greeting ?? ""}
            onChange={(e) => update("greeting", e.target.value as Role["greeting"])}
            className="min-h-[80px] rounded border border-panel-border bg-panel p-2 text-xs text-slate-50 placeholder:text-muted resize-y"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-muted">
          Prompt 限定 / 禁用
          <textarea
            value={role?.prompt ?? ""}
            onChange={(e) => update("prompt", e.target.value as Role["prompt"])}
            className="min-h-[80px] rounded border border-panel-border bg-panel p-2 text-xs text-slate-50 placeholder:text-muted resize-y"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-muted">
          劇本（每行一句）
          <textarea
            value={(Array.isArray(role?.script) ? role?.script : []).join("\n")}
            onChange={(e) => update("script", e.target.value.split("\n"))}
            className="min-h-[80px] rounded border border-panel-border bg-panel p-2 text-xs text-slate-50 placeholder:text-muted resize-y"
          />
        </label>
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm font-semibold text-slate-50">對話測試</p>
        <div className="flex-1 space-y-2 overflow-y-auto rounded-lg border border-panel-border bg-panel p-2 text-xs">
          {chatMessages.length === 0 && <p className="text-muted">還沒有對話，輸入內容開始測試。</p>}
          {chatMessages.map((msg, idx) => (
            <div key={`${msg.sender}-${idx}`} className="space-y-1">
              <p className="text-[10px] font-semibold text-muted">{msg.sender === "user" ? "你" : role?.name ?? "AI"}</p>
              <p className="whitespace-pre-wrap text-slate-50">{msg.text}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="輸入一句話試聊"
            className="flex-1 rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
          />
          <button
            className="rounded-lg bg-accent/90 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-glow disabled:opacity-60"
            onClick={sendTestMessage}
            disabled={testSending || !chatInput.trim()}
          >
            {testSending ? "發送中…" : "發送"}
          </button>
        </div>
      </Card>
    </div>
  );

  if (loading) {
    return <p className="text-sm text-muted">載入中…</p>;
  }

  if (!role) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">未找到角色，可能已被刪除。</p>
        <button className="rounded-lg border border-panel-border px-3 py-2 text-xs text-slate-100" onClick={() => router.push("/roles")}>
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <SectionHeader
        title={role.name}
        subtitle="對話管理 / 素材管理"
        icon={<ArrowLeft className="h-5 w-5 text-muted" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-panel-border bg-panel p-1 text-xs">
              <button
                className={`rounded-md px-3 py-1.5 ${activeTab === "dialog" ? "bg-accent/80 text-slate-900 shadow-glow" : "text-slate-100"}`}
                onClick={() => setActiveTab("dialog")}
              >
                對話管理
              </button>
              <button
                className={`rounded-md px-3 py-1.5 ${activeTab === "assets" ? "bg-accent/80 text-slate-900 shadow-glow" : "text-slate-100"}`}
                onClick={() => setActiveTab("assets")}
              >
                素材管理
              </button>
            </div>
            <Badge tone={statusTone(role.status)}>{role.status}</Badge>
            <button
              className="flex items-center gap-1 rounded-lg border border-panel-border px-3 py-2 text-xs text-slate-100 hover:border-accent/60"
              onClick={() => router.push("/roles")}
            >
              <ArrowLeft className="h-4 w-4" /> 返回列表
            </button>
            <button
              className="flex items-center gap-1 rounded-lg border border-danger/60 px-3 py-2 text-xs text-danger hover:bg-danger/10"
              onClick={deleteAndBack}
            >
              <Trash2 className="h-4 w-4" /> 刪除
            </button>
            <button
              className="flex items-center gap-1 rounded-lg bg-accent/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-glow disabled:opacity-60"
              onClick={save}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存
            </button>
          </div>
        }
      />

      {activeTab === "dialog" ? renderDialogTab() : renderAssetsTab()}
    </div>
  );
}

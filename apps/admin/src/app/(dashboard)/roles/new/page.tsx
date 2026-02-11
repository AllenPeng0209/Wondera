"use client";

import { Card, SectionHeader } from "@/components/ui";
import { createRole, type RoleCreatePayload } from "@/lib/api";
import { readRoles, upsertRole } from "@/lib/role-store";
import { Role } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewRolePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [mood, setMood] = useState("平穩");
  const [snippet, setSnippet] = useState("");
  const [persona, setPersona] = useState("");
  const [greeting, setGreeting] = useState("");
  const [prompt, setPrompt] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [avatar, setAvatar] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("請填寫角色名稱");
      return;
    }
    setSubmitting(true);
    const tags = tagsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const script = scriptText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload: RoleCreatePayload = {
      name: trimmedName,
      title: title.trim() || undefined,
      city: city.trim() || undefined,
      mood: mood.trim() || undefined,
      description: snippet.trim() || undefined,
      persona: persona.trim() || undefined,
      greeting: greeting.trim() || undefined,
      tags: tags.length ? tags : undefined,
      script: script.length ? script : undefined,
      avatar: avatar.trim() || undefined,
      heroImage: heroImage.trim() || undefined,
    };
    try {
      const created = await createRole(payload);
      upsertRole(created as unknown as Role);
      router.push(`/roles/${created.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SectionHeader
        title="新增角色"
        subtitle="填寫以下欄位後創建角色，可稍後在詳情頁繼續編輯。"
        icon={<ArrowLeft className="h-5 w-5 text-muted" />}
        actions={
          <button
            type="button"
            onClick={() => router.push("/roles")}
            className="rounded-lg border border-panel-border px-3 py-2 text-xs text-slate-100 hover:border-accent/60"
          >
            <ArrowLeft className="mr-1 inline h-4 w-4" /> 返回列表
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 overflow-y-auto">
        <div className="grid w-full gap-4 lg:grid-cols-3">
          {/* 左欄：基本資訊與發現 */}
          <Card className="flex flex-col gap-3 p-4">
            <p className="text-xs font-semibold text-slate-50">基本資訊與發現</p>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">名稱 <span className="text-amber-400">*</span></span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：Antonie"
                className="rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">身份標籤</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：浪漫陪伴、溫柔醫生"
                className="rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">城市</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="例：巴黎、台北"
                className="rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">心情 / 狀態</span>
              <input
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="例：想你、平穩"
                className="rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">一句話摘要</span>
              <input
                value={snippet}
                onChange={(e) => setSnippet(e.target.value)}
                placeholder="列表與預覽用的一句話介紹"
                className="rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">標籤（逗號分隔）</span>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="例：浪漫, 陪伴, 治癒"
                className="rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
              />
            </label>
          </Card>

          {/* 中欄：人設與對話（AI 核心） */}
          <Card className="flex flex-col gap-3 p-4">
            <p className="text-xs font-semibold text-slate-50">人設與對話（AI 核心）</p>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">Persona / 人設 <span className="text-amber-400">*</span></span>
              <textarea
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="角色系統提示詞、語氣、背景與人設，決定 AI 如何回覆"
                className="min-h-[100px] rounded border border-panel-border bg-panel p-2 text-xs text-slate-50 placeholder:text-muted resize-y"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">Greeting / 開場白</span>
              <textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="與用戶的第一句開場，可作為首句示例"
                className="min-h-[60px] rounded border border-panel-border bg-panel p-2 text-xs text-slate-50 placeholder:text-muted resize-y"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">Prompt 規則 / 禁止項</span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="額外規則、禁止內容、長度與格式要求"
                className="min-h-[60px] rounded border border-panel-border bg-panel p-2 text-xs text-slate-50 placeholder:text-muted resize-y"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">劇本 / 腳本（每行一句，fallback 用）</span>
              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="每行一句，用於離線或 API 失敗時的預設回覆"
                className="min-h-[80px] rounded border border-panel-border bg-panel p-2 text-xs text-slate-50 placeholder:text-muted resize-y"
              />
            </label>
          </Card>

          {/* 右欄：視覺素材 */}
          <Card className="flex flex-col gap-3 p-4">
            <p className="text-xs font-semibold text-slate-50">視覺素材</p>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">頭像 URL</span>
              <input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="留空使用預設頭像"
                className="rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">主圖 / Hero URL</span>
              <input
                value={heroImage}
                onChange={(e) => setHeroImage(e.target.value)}
                placeholder="留空使用預設主圖"
                className="rounded border border-panel-border bg-panel px-2 py-1.5 text-sm text-slate-50 placeholder:text-muted"
              />
            </label>
            {error && (
              <p className="text-xs text-amber-400" role="alert">
                建立失敗（未寫入 Supabase）：{error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="mt-auto rounded-lg bg-accent/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow-glow disabled:opacity-60"
            >
              {submitting ? "創建中…" : "創建並進入編輯"}
            </button>
          </Card>
        </div>
      </form>
    </div>
  );
}

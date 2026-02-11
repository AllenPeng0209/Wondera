"use client";

import { useEffect, useState } from 'react';
import { formatCount, generateWanImage, generateWanVideoFromImage, saveWanAsset, updateRole } from '@/lib/api';
import type { Role } from '@/types/content';

type RoleBoardProps = { roles: Role[] };

const defaultImagePrompt = (name?: string) =>
  `賽博霓虹下的城市帥哥寫真，膠片質感柔光特寫，${name ?? '角色'}的情緒流動`;

const defaultVideoPrompt =
  '鏡頭平移與慢推，呼吸起伏、眨眼微笑的細節，電影級運鏡，氛圍感燈光';

export function RoleBoard({ roles }: RoleBoardProps) {
  const [items, setItems] = useState<Role[]>(roles);

  useEffect(() => {
    setItems(roles);
  }, [roles]);

  // Prompt management state
  const [promptRole, setPromptRole] = useState<Role | null>(null);
  const [persona, setPersona] = useState('');
  const [greeting, setGreeting] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [promptMessage, setPromptMessage] = useState<string | null>(null);
  const [promptSaving, setPromptSaving] = useState(false);

  // Asset generation state
  const [assetRole, setAssetRole] = useState<Role | null>(null);
  const [imagePrompt, setImagePrompt] = useState(defaultImagePrompt());
  const [videoPrompt, setVideoPrompt] = useState(defaultVideoPrompt);
  const [imageResult, setImageResult] = useState<Awaited<ReturnType<typeof generateWanImage>> | null>(null);
  const [videoResult, setVideoResult] = useState<Awaited<ReturnType<typeof generateWanVideoFromImage>> | null>(null);
  const [assetMessage, setAssetMessage] = useState<string | null>(null);
  const [assetLoading, setAssetLoading] = useState<'image' | 'video' | 'saveImage' | 'saveVideo' | null>(null);

  const openPrompt = (role: Role) => {
    setPromptRole(role);
    setPersona(role.persona ?? '');
    setGreeting(role.greeting ?? '');
    setScriptText((role.script ?? []).join('\n'));
    setPromptMessage(null);
  };

  const savePrompt = async () => {
    if (!promptRole) return;
    setPromptSaving(true);
    setPromptMessage(null);
    const parsedScript = scriptText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const payload = {
      persona: persona.trim() || undefined,
      greeting: greeting.trim() || undefined,
      script: parsedScript.length ? parsedScript : undefined,
    };
    const updated = await updateRole(promptRole.id, payload);
    if (updated) {
      setItems((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setPromptRole({ ...promptRole, ...updated });
      setPromptMessage('已保存到角色');
    } else {
      setPromptMessage('保存失敗，請確認後端服務是否啟動');
    }
    setPromptSaving(false);
  };

  const openAsset = (role: Role) => {
    setAssetRole(role);
    setImagePrompt(defaultImagePrompt(role.name));
    setVideoPrompt(defaultVideoPrompt);
    setImageResult(null);
    setVideoResult(null);
    setAssetMessage(null);
    setAssetLoading(null);
  };

  const runImage = async () => {
    if (!assetRole) return;
    setAssetLoading('image');
    setAssetMessage(null);
    const res = await generateWanImage({ prompt: imagePrompt, role_id: assetRole.id, save: false });
    if (res) {
      setImageResult(res);
      setAssetMessage('帥哥圖生成完成');
    } else {
      setAssetMessage('生成失敗，請確認後端 8000 已啟動並配置 DashScope API Key');
    }
    setAssetLoading(null);
  };

  const runVideo = async () => {
    if (!assetRole || !imageResult?.imageUrl) return;
    setAssetLoading('video');
    setAssetMessage(null);
    const res = await generateWanVideoFromImage({
      imageUrl: imageResult.imageUrl,
      prompt: videoPrompt,
      roleId: assetRole.id,
      save: false,
    });
    if (res) {
      setVideoResult(res);
      setAssetMessage('視頻生成完成，可預覽或保存');
    } else {
      setAssetMessage('生成視頻失敗，請稍後重試');
    }
    setAssetLoading(null);
  };

  const saveImage = async () => {
    if (!assetRole || !imageResult?.imageUrl) return;
    setAssetLoading('saveImage');
    const saved = await saveWanAsset(imageResult.imageUrl, assetRole.id, 'images');
    setAssetMessage(saved ? '圖片已存入素材庫' : '保存圖片失敗');
    if (saved) {
      setImageResult({ ...imageResult, saved });
    }
    setAssetLoading(null);
  };

  const saveVideo = async () => {
    if (!assetRole || !videoResult?.videoUrl) return;
    setAssetLoading('saveVideo');
    const saved = await saveWanAsset(videoResult.videoUrl, assetRole.id, 'videos');
    setAssetMessage(saved ? '視頻已存入素材庫' : '保存視頻失敗');
    if (saved) {
      setVideoResult({ ...videoResult, saved });
    }
    setAssetLoading(null);
  };

  const renderPromptModal = () => {
    if (!promptRole) return null;
    return (
      <div className="role-modal" role="dialog" aria-modal="true">
        <div className="role-modal-backdrop" onClick={() => setPromptRole(null)} />
        <div className="role-modal-body">
          <div className="role-modal-header">
            <div>
              <div className="eyebrow">管理 Prompt</div>
              <h3>{promptRole.name}</h3>
              <p className="muted">對 persona、開場話術與 Script 進行微調。</p>
            </div>
            <button className="ghost-button" onClick={() => setPromptRole(null)}>
              關閉
            </button>
          </div>
          <div className="field-grid">
            <label className="field">
              <span className="field-label">Persona</span>
              <textarea
                className="textarea-soft"
                rows={4}
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="角色背景、語氣、講話節奏..."
              />
            </label>
            <label className="field">
              <span className="field-label">Greeting / 開場白</span>
              <textarea
                className="textarea-soft"
                rows={3}
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="第一句要怎麼和用戶打招呼？"
              />
            </label>
            <label className="field field--full">
              <span className="field-label">Script / 指令片段</span>
              <textarea
                className="textarea-soft"
                rows={4}
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="每行一條行為提示，例如：保持語速放鬆；回答別超過 3 句。"
              />
              <small className="muted">每行會拆分成陣列，供聊天系統提示使用。</small>
            </label>
          </div>
          <div className="role-modal-footer">
            {promptMessage && <span className="pill pill-accent">{promptMessage}</span>}
            <div className="spacer" />
            <button className="ghost-button" onClick={() => setPromptRole(null)}>
              取消
            </button>
            <button className="primary-button" onClick={savePrompt} disabled={promptSaving}>
              {promptSaving ? '保存中...' : '保存 Prompt'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAssetModal = () => {
    if (!assetRole) return null;
    return (
      <div className="role-modal" role="dialog" aria-modal="true">
        <div className="role-modal-backdrop" onClick={() => setAssetRole(null)} />
        <div className="role-modal-body">
          <div className="role-modal-header">
            <div>
              <div className="eyebrow">管理素材</div>
              <h3>{assetRole.name}</h3>
              <p className="muted">1) 用 Wan 2.2 生成帥哥圖 2) 基於該圖生成短視頻。</p>
            </div>
            <button className="ghost-button" onClick={() => setAssetRole(null)}>
              關閉
            </button>
          </div>

          <div className="asset-grid">
            <div className="asset-card">
              <div className="step-chip">Step 1 · 帥哥圖</div>
              <label className="field">
                <span className="field-label">圖像提示詞</span>
                <textarea
                  className="textarea-soft"
                  rows={3}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                />
              </label>
              <div className="actions-row">
                <button className="primary-button" onClick={runImage} disabled={assetLoading === 'image'}>
                  {assetLoading === 'image' ? '生成中...' : '生成帥哥圖'}
                </button>
                {imageResult?.imageUrl && (
                  <button className="ghost-button" onClick={saveImage} disabled={assetLoading === 'saveImage'}>
                    {assetLoading === 'saveImage' ? '保存中...' : '保存這張圖'}
                  </button>
                )}
              </div>
              {imageResult?.imageUrl && (
                <div className="asset-preview">
                  <div
                    className="asset-image"
                    style={{ backgroundImage: `url(${imageResult.imageUrl})` }}
                    aria-label="生成圖片預覽"
                  />
                  <div className="muted tiny">Model: {imageResult.model}</div>
                </div>
              )}
            </div>

            <div className="asset-card">
              <div className="step-chip">Step 2 · 圖生視頻</div>
              <label className="field">
                <span className="field-label">視頻提示詞</span>
                <textarea
                  className="textarea-soft"
                  rows={3}
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  disabled={!imageResult}
                  placeholder="可描述運鏡、情緒、動作等"
                />
              </label>
              <div className="actions-row">
                <button
                  className="primary-button"
                  onClick={runVideo}
                  disabled={!imageResult || assetLoading === 'video'}
                >
                  {assetLoading === 'video' ? '生成中...' : '基於這張圖生成視頻'}
                </button>
                {videoResult?.videoUrl && (
                  <button className="ghost-button" onClick={saveVideo} disabled={assetLoading === 'saveVideo'}>
                    {assetLoading === 'saveVideo' ? '保存中...' : '保存視頻'}
                  </button>
                )}
              </div>
              {videoResult?.videoUrl && (
                <div className="asset-preview">
                  <video className="asset-video" src={videoResult.videoUrl} controls playsInline />
                  <div className="muted tiny">
                    Model: {videoResult.model} · {videoResult.resolution} · {videoResult.duration}s
                  </div>
                </div>
              )}
            </div>
          </div>
          {assetMessage && <div className="pill pill-accent">{assetMessage}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="view">
      <div className="role-board-header">
        <div>
          <div className="eyebrow">角色工作台</div>
          <h2>全部角色</h2>
          <p className="muted">為每個角色配置 Prompt 與素材，串通 Wan 2.2 圖生圖/視頻流程。</p>
        </div>
      </div>

      <div className="card-grid role-grid">
        {items.map((role) => (
          <div className="role-card role-manage" key={role.id}>
            <div className="role-image" style={{ backgroundImage: `url(${role.heroImage})` }} />
            <div className="role-body">
              <div className="role-title-row">
                <div>
                  <div className="role-title">{role.name}</div>
                  <div className="role-sub">
                    {role.title} · {role.city}
                  </div>
                </div>
                <span className="pill">{role.mood || '心情未知'}</span>
              </div>
              <div className="role-meta">
                <span className="muted">{role.tags?.slice(0, 3).join(' / ') || '待補充標籤'}</span>
                <span>{formatCount(role.likes)} 喜歡</span>
              </div>
              <div className="role-actions">
                <button className="ghost-button" onClick={() => openPrompt(role)}>
                  管理 Prompt
                </button>
                <button className="primary-button" onClick={() => openAsset(role)}>
                  管理素材
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {renderPromptModal()}
      {renderAssetModal()}
    </div>
  );
}

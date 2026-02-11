"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { getChat, getRoles, postChat } from '@/lib/api';
import { seedChats, seedRoles } from '@/lib/seeds';
import type { ChatMessage, Role } from '@/types/content';

type MessagesMap = Record<string, ChatMessage[]>;

export function ChatView() {
  const searchParams = useSearchParams();
  const [roles, setRoles] = useState<Role[]>(seedRoles);
  const [activeRole, setActiveRole] = useState<string>(seedRoles[0]?.id ?? '');
  const [messagesMap, setMessagesMap] = useState<MessagesMap>(() => seedChats);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const previewRole = useMemo(() => {
    const raw = searchParams.get('previewRole');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Role;
    } catch {
      try {
        return JSON.parse(decodeURIComponent(raw)) as Role;
      } catch {
        return null;
      }
    }
  }, [searchParams]);

  const isPreview = Boolean(previewRole);

  useEffect(() => {
    if (previewRole) {
      setRoles((prev) => {
        const without = prev.filter((r) => r.id !== previewRole.id);
        return [previewRole, ...without];
      });
      setActiveRole(previewRole.id);
      return;
    }
    getRoles().then((data) => {
      if (!data.length) return;
      setRoles(data);
      setActiveRole((prev) => prev || data[0].id);
    });
  }, [previewRole]);

  useEffect(() => {
    if (!activeRole) return;
    if (messagesMap[activeRole]) return;
    getChat(activeRole).then((data) => {
      setMessagesMap((prev) => ({ ...prev, [activeRole]: data }));
    });
  }, [activeRole, messagesMap]);

  const messages = useMemo(() => messagesMap[activeRole] ?? [], [messagesMap, activeRole]);
  const current = useMemo(() => roles.find((r) => r.id === activeRole), [roles, activeRole]);
  const currentAssets = useMemo(() => {
    if (!current) return [];
    const assets = current.assets ?? [];
    if (assets.length) return assets;
    const fallbacks = [current.heroImage, current.avatar].filter(Boolean) as string[];
    return fallbacks;
  }, [current]);

  // Split AI reply into smaller bubbles for readability (mobile/admin shared behavior).
  const splitReplyIntoChunks = useCallback((content: string): string[] => {
    const normalized = (content || '').replace(/\r/g, '').trim();
    if (!normalized) return [];
    if (normalized.includes('\n')) {
      return normalized
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    }
    const byPunctuation = normalized
      .split(/(?<=[.!?。！？])/)
      .map((s) => s.trim())
      .filter(Boolean);
    return byPunctuation.length > 0 ? byPunctuation : [normalized];
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!activeRole || !text.trim()) return;
      const clean = text.trim();
      setSending(true);
      setMessagesMap((prev) => {
        const list = prev[activeRole] ?? [];
        return { ...prev, [activeRole]: [...list, { sender: 'user', text: clean }] };
      });
      setInput('');
      const list = messagesMap[activeRole] ?? [];
      const apiMessages = list.map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));
      apiMessages.push({ role: 'user', content: clean });
      const role = roles.find((r) => r.id === activeRole);
      const isPreviewRole = Boolean(previewRole);
      const res = await postChat(
        isPreviewRole ? null : activeRole,
        isPreviewRole && role ? { name: role.name, persona: role.persona, greeting: role.greeting } : null,
        apiMessages
      );
      const aiRaw = res?.content?.trim() || 'I stepped away for a moment—mind asking again?';
      const chunks = splitReplyIntoChunks(aiRaw);
      const aiMessages =
        chunks.length > 0 ? chunks.map((text) => ({ sender: 'ai' as const, text })) : [{ sender: 'ai' as const, text: aiRaw }];
      setMessagesMap((prev) => {
        const nextList = prev[activeRole] ?? [];
        return { ...prev, [activeRole]: [...nextList, ...aiMessages] };
      });
      setSending(false);
    },
    [activeRole, messagesMap, roles, previewRole, splitReplyIntoChunks]
  );

  const onSubmit = useCallback(() => {
    sendMessage(input);
  }, [sendMessage, input]);

  return (
    <div className="chat-frame">
      {/* Left drawer */}
      <aside className="chat-drawer">
        <div className="chat-drawer-header">
          <div>
            <div className="chat-drawer-title">Chats</div>
            <div className="chat-drawer-sub">切換角色開始對話</div>
          </div>
          <button className="chat-drawer-action">新增</button>
        </div>
        <div className="chat-drawer-list">
          {roles.map((role) => (
            <button
              key={role.id}
              className={clsx('chat-drawer-item', role.id === activeRole && 'is-active')}
              onClick={() => setActiveRole(role.id)}
            >
              <div className="chat-drawer-avatar" style={{ backgroundImage: `url(${role.avatar})` }} />
              <div className="chat-drawer-text">
                <div className="chat-drawer-name">{role.name}</div>
                <div className="chat-drawer-snippet">{role.snippet ?? '開始聊天'}</div>
              </div>
              <div className="chat-drawer-badge">{role.mood}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-center">
        {isPreview && previewRole && (
          <div className="list-meta">預覽模式：{previewRole.name}（管理者預覽）。返回列表可切換正式角色。</div>
        )}
        <header className="chat-header">
          <div className="chat-header-left">
            <div className="chat-top-avatar" style={{ backgroundImage: `url(${current?.avatar})` }} />
            <div>
              <div className="chat-top-name">
                {current?.name ?? '未選角色'} <span className="chat-verified">✔</span>
              </div>
              <div className="chat-top-meta">{current?.title ?? ''}</div>
            </div>
          </div>
          <div className="chat-header-actions">
            <span className="chip">{current?.city ?? '城市'}</span>
            <span className="chip">{current?.mood ?? '心情'}</span>
            <button className="chat-top-chip" onClick={() => setMessagesMap((prev) => ({ ...prev, [activeRole]: [] }))}>
              清空對話
            </button>
          </div>
        </header>

        <div className="chat-messages" ref={scrollRef}>
          {messages.map((msg, idx) => (
            <div key={idx} className={clsx('chat-line', msg.sender === 'user' ? 'to-right' : 'to-left')}>
              <div className={clsx('chat-bubble', msg.sender)}>
                <div>{msg.text}</div>
              </div>
              <div className="chat-time">11:12 AM</div>
            </div>
          ))}
          {messages.length === 0 && <div className="list-meta">No chats yet — start a conversation.</div>}
          <div className="chat-line to-left">
            <div className="chat-bubble ai typing">{current?.name ?? 'AI'} is typing ...</div>
          </div>
        </div>

        <div className="chat-input-bar">
          <textarea
            rows={1}
            placeholder="輸入訊息..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
          />
          <button className="chat-send" onClick={onSubmit} disabled={!input.trim() || sending}>
            Send
          </button>
        </div>
      </section>

      {/* Right gallery: current role assets */}
      <aside className="chat-gallery">
        <div className="chat-gallery-head">
          <div className="chat-gallery-title">素材庫 · {current?.name ?? '角色'}</div>
          <div className="chip-row">
            <span className="chip chip-active">全部素材</span>
          </div>
        </div>
        <div className="chat-gallery-grid">
          {currentAssets.map((asset, idx) => {
            const isVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(asset);
            return (
              <div className="chat-asset-card" key={`${asset}-${idx}`}>
                {isVideo ? (
                  <video className="chat-asset-media" src={asset} controls playsInline />
                ) : (
                  <div className="chat-asset-img" style={{ backgroundImage: `url(${asset})` }} />
                )}
                <div className="chat-asset-meta">
                  <div className="chat-asset-title">{current?.name ?? '素材'}</div>
                  <div className="chat-asset-sub">素材 {idx + 1}</div>
                </div>
              </div>
            );
          })}
          {!currentAssets.length && <div className="list-meta">暫無素材，開始聊天即可累積。</div>}
        </div>
      </aside>
    </div>
  );
}

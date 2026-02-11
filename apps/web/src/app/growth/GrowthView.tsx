"use client";

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { Achievement, MemoryRecord, Role, Task } from '@/types/content';

type Props = {
  roles: Role[];
  tasks: Task[];
  achievements: Achievement[];
  memories: Record<string, MemoryRecord[]>;
};

export function GrowthView({ roles, tasks, achievements, memories }: Props) {
  const [activeRoleId, setActiveRoleId] = useState<string>(roles[0]?.id ?? '');
  const [menuOpen, setMenuOpen] = useState(false);

  const activeRole = useMemo(() => roles.find((r) => r.id === activeRoleId), [roles, activeRoleId]);
  const memoriesForRole = useMemo(() => memories[activeRoleId] ?? [], [memories, activeRoleId]);

  const handleSelect = (roleId: string) => {
    setActiveRoleId(roleId);
    setMenuOpen(false);
  };

  return (
    <div className="view growth-view">
      <div className="growth-top">
        <div className="persona-switch-wrap">
          <button
            className={clsx('persona-switch', menuOpen && 'is-open')}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
          >
            <div
              className="persona-avatar"
              style={{ backgroundImage: `url(${activeRole?.avatar ?? roles[0]?.avatar ?? ''})` }}
            >
              <span className="persona-arrow">▾</span>
            </div>
            <div className="persona-text">
              <div className="persona-label">高頻對話角色</div>
              <div className="persona-name">{activeRole?.name ?? '選擇角色'}</div>
              <div className="persona-sub">{activeRole?.title ?? '切換下方記憶紀錄'}</div>
            </div>
          </button>

          {menuOpen && (
            <div className="persona-menu">
              {roles.map((role) => (
                <button
                  key={role.id}
                  className={clsx('persona-menu-item', role.id === activeRoleId && 'is-active')}
                  onClick={() => handleSelect(role.id)}
                >
                  <div className="persona-menu-avatar" style={{ backgroundImage: `url(${role.avatar})` }} />
                  <div className="persona-menu-text">
                    <div className="persona-menu-name">{role.name}</div>
                    <div className="persona-menu-sub">
                      {role.title} · {role.city}
                    </div>
                  </div>
                  <span className="persona-menu-tag">{role.mood}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="persona-summary">
          <div className="summary-row">
            <div className="summary-block">
              <div className="summary-label">記憶條目</div>
              <div className="summary-value">{memoriesForRole.length}</div>
            </div>
            <div className="summary-block">
              <div className="summary-label">最近更新</div>
              <div className="summary-value">{memoriesForRole[0]?.time ?? '—'}</div>
            </div>
          </div>
          <p className="list-meta">切換角色即可查看專屬的對話成長記憶，與 mobile 版「Ta 的記憶」設定一致。</p>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>對話記憶</h2>
          <div className="pill">與 {activeRole?.name ?? '角色'} 的全部紀錄</div>
        </div>
        <div className="memory-grid">
          {memoriesForRole.map((item) => (
            <div className="memory-card" key={item.id}>
              <div className="memory-head">
                <span className="badge">{item.tag ?? '對話記憶'}</span>
                <span className="memory-time">{item.time}</span>
              </div>
              <h4 className="memory-title">{item.title}</h4>
              <p className="list-meta">{item.detail}</p>
              {item.delta && <div className="memory-delta">{item.delta}</div>}
            </div>
          ))}
          {!memoriesForRole.length && <div className="list-meta">尚無記憶紀錄，開始對話試試。</div>}
        </div>
      </div>

      <div className="growth-grid">
        <div className="stat-card">
          <h3>對話親密值</h3>
          <div className="stat-value">728</div>
          <div className="progress">
            <div className="progress-fill" style={{ width: '64%' }} />
          </div>
          <p className="list-meta">與 {activeRole?.name ?? 'TA'} 再聊一會就能升級下一段關係。</p>
        </div>
        <div className="stat-card">
          <h3>連續對話</h3>
          <div className="stat-value">12 天</div>
          <div className="stat-meta">最長 18 天</div>
          <div className="stat-meta">今日互動 6 次</div>
        </div>
        <div className="stat-card">
          <h3>情緒成長</h3>
          <div className="stat-value">38</div>
          <div className="stat-meta">已解鎖 21 條 · 尚可累積 4</div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>每日任務</h2>
          <div className="pill">今日完成 2 / 5</div>
        </div>
        <div className="list-card">
          {tasks.map((item) => (
            <div className="list-item" key={item.title}>
              <div>
                <div className="list-title">{item.title}</div>
                <div className="list-meta">{item.meta}</div>
              </div>
              <div className="badge">{item.status}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>成就</h2>
          <div className="pill">解鎖 1 / 8</div>
        </div>
        <div className="growth-grid">
          {achievements.map((item) => (
            <div className="stat-card" key={item.title}>
              <div className="list-title">{item.title}</div>
              <div className="list-meta">{item.meta}</div>
              <div className="badge">{item.badge}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

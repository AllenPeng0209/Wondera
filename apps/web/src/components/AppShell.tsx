"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import type { ReactNode } from 'react';

const navItems = [
  { href: '/explore', label: '探索', sub: '靈感地圖' },
  { href: '/chats', label: '私語', sub: '對話空間' },
  { href: '/feed', label: '動態', sub: '心情流' },
  { href: '/growth', label: '成長', sub: '任務與成就' },
  { href: '/profile', label: '個人設定', sub: '偏好與帳戶' }
];

export function AppShell({ children, mainClassName }: { children: ReactNode; mainClassName?: string }) {
  const pathname = usePathname();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">W</div>
          <div>
            <div className="brand-title">Wondera</div>
            <div className="brand-subtitle">Wondera — 心境陪伴</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link key={item.href} className={clsx('nav-item', active && 'is-active')} href={item.href}>
                <span>{item.label}</span>
                <small>{item.sub}</small>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-section">
          <div className="section-label">蹇€熼枊鍟?</div>
          <div className="quick-grid">
            <button className="chip-button">浠婃棩蹇冭烦</button>
            <button className="chip-button">澶滈枔绱勬渻</button>
            <button className="chip-button">澧炲箙濂芥劅</button>
            <button className="chip-button">骞绘兂鍟嗗簵</button>
          </div>
        </div>

        <div className="sidebar-card">
          <div className="sidebar-card-title">鎴戞兂瑕佸皥灞亸鎰?</div>
          <p>鍛婅ù鎴戜綘鐨勬儏绶掕垏鍠滃ソ锛岃畵 AI 鐐轰綘閰嶅皪鏈€鎳備綘鐨勫妵鎯呰垏瑙掕壊銆?</p>
          <button className="primary-button">寤虹珛灏堝爆鍔囨湰</button>
        </div>

        <div className="sidebar-footer">
          <button className="ghost-button">鐧诲叆</button>
          <button className="ghost-button">鏀惰棌鍙ｄ换</button>
        </div>
      </aside>

      <main className={clsx('main', mainClassName)}>{children}</main>
    </div>
  );
}

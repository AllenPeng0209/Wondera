import { AppShell } from '@/components/AppShell';
import { Topbar } from '@/components/Topbar';

const profile = {
  name: '露娜・帕克',
  title: '夢境製圖師',
  subtitle: '研究情緒儀式與清醒入夢路徑',
  location: '中國・上海',
  mood: '安靜且好奇',
  sessions: 328,
  streak: 12,
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=640&q=80',
  banner: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
  lastSync: '2 月 1 日',
  tags: ['清醒練習', '夜市漫遊', '慢熱體質', '溫柔步調']
};

const statBars = [
  { label: '清晰度', value: 82, delta: '今日 +4' },
  { label: '信任流程', value: 74, delta: '本週 +6' },
  { label: '落地感', value: 68, delta: '需要呼吸練習' }
];

const milestones = [
  { title: '建立安全錨點', detail: '暖身呼吸＋說出迴圈', state: 'done' as const },
  { title: '整理重複符號', detail: '紅燈＋隱藏房間', state: 'done' as const },
  { title: '改寫侵入腳本', detail: '換成溫柔提示語', state: 'current' as const },
  { title: '清醒入夢演練', detail: '睡前 45 秒可視化', state: 'next' as const }
];

const quests = [
  { title: '夜間落地 8 分鐘', progress: 0.76, meta: '已完成 3 / 4', impact: '＋呼吸穩定' },
  { title: '記錄一則夢片段', progress: 0.42, meta: '1 / 3 條目', impact: '＋記憶' },
  { title: '與愛德華回報', progress: 0.9, meta: '已排程 22:30', impact: '＋信任' }
];

const memories = [
  {
    title: '雨點落在地鐵窗',
    mood: '柔焦',
    time: '今天 06:40',
    note: '喊出重複的恐懼後做 4-6 呼吸，車廂變得柔和。'
  },
  {
    title: '夜市與愛德華散步',
    mood: '暖',
    time: '昨天 22:10',
    note: '一起吃桂花串，練習開放式提問，不催促回答。'
  },
  {
    title: '鏡廊演練',
    mood: '穩',
    time: '週三 23:30',
    note: '凝視 15 秒，肩膀保持放鬆，沒有再度遊離。'
  }
];

const circle = [
  {
    name: '安東萬',
    role: '溫柔守護',
    status: '在線 - 5 分鐘前',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=320&q=80'
  },
  {
    name: '愛德華',
    role: '夜市嚮導',
    status: '下次回報 22:30',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=320&q=80'
  },
  {
    name: '祁嵐',
    role: '清醒教練',
    status: '正在輸入...',
    avatar: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=320&q=80'
  }
];

export default function ProfilePage() {
  return (
    <AppShell>
      <Topbar />
      <div className="view profile-view">
        <section className="profile-hero">
          <div className="profile-hero-bg" style={{ backgroundImage: `url(${profile.banner})` }} />
          <div className="profile-hero-content">
            <div className="profile-hero-top">
              <div className="profile-avatar" style={{ backgroundImage: `url(${profile.avatar})` }} />
              <div>
                <div className="badge">連續簽到 · 第 {profile.streak} 天</div>
                <h1 className="profile-name">{profile.name}</h1>
                <p className="profile-title">{profile.title}</p>
                <p className="profile-meta">
                  {profile.subtitle} · {profile.location} · {profile.sessions} 場引導
                </p>
                <div className="chip-row profile-tags">
                  {profile.tags.map((tag) => (
                    <span className="chip" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="profile-hero-actions">
                <button className="primary-button">開始引導</button>
                <button className="ghost-button">分享檔案</button>
                <div className="pill">上次同步 {profile.lastSync}</div>
              </div>
            </div>
            <div className="profile-mini-stats">
              {statBars.map((stat) => (
                <div className="mini-stat" key={stat.label}>
                  <div className="mini-stat-head">
                    <span className="mini-stat-label">{stat.label}</span>
                    <span className="mini-stat-delta">{stat.delta}</span>
                  </div>
                  <div className="mini-stat-value">{stat.value}%</div>
                  <div className="meter">
                    <div className="meter-fill" style={{ width: `${stat.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="profile-grid">
          <div className="profile-column">
            <div className="panel">
              <div className="section-header">
                <h3>目前章節</h3>
                <span className="pill">{profile.mood}</span>
              </div>
              <p className="profile-copy">
                露娜正在練習放慢節奏，保持短而穩定的儀式。這一章的目標是：當夜市意象出現時能穩住心跳，將焦慮換成好奇。
              </p>
              <div className="badge-row">
                <span className="badge">慢熱開場</span>
                <span className="badge">聲音優先</span>
                <span className="badge">避免劇透</span>
              </div>
            </div>

            <div className="panel">
              <div className="section-header">
                <h3>命運路線</h3>
                <button className="link-button" type="button">
                  查看存檔
                </button>
              </div>
              <div className="journey-rail">
                {milestones.map((step) => (
                  <div
                    className={`journey-step ${step.state === 'done' ? 'is-done' : ''} ${
                      step.state === 'current' ? 'is-current' : ''
                    }`}
                    key={step.title}
                  >
                    <div className="journey-dot" />
                    <div>
                      <div className="journey-title">{step.title}</div>
                      <div className="journey-detail">{step.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="section-header">
                <h3>夢境日誌</h3>
                <span className="pill">自動儲存 · 僅自己可見</span>
              </div>
              <div className="timeline profile-timeline">
                {memories.map((item) => (
                  <div className="timeline-item" key={item.title}>
                    <div className="timeline-dot" />
                    <div className="timeline-card">
                      <div className="profile-log-head">
                        <strong>{item.title}</strong>
                        <span className="pill">{item.time}</span>
                      </div>
                      <div className="profile-log-meta">{item.mood}</div>
                      <p className="list-meta">{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="profile-column">
            <div className="panel">
              <div className="section-header">
                <h3>即時訊號</h3>
                <span className="pill">Live</span>
              </div>
              <div className="profile-signal-grid">
                <div className="signal-card">
                  <div className="signal-label">今晚焦點</div>
                  <div className="signal-value">溫柔入夢</div>
                  <div className="signal-meta">暫停劇情反轉，專注呼吸提示。</div>
                </div>
                <div className="signal-card">
                  <div className="signal-label">敏感度</div>
                  <div className="signal-value">低噪音 · 明亮光</div>
                  <div className="meter meter-soft">
                    <div className="meter-fill" style={{ width: '62%' }} />
                  </div>
                  <div className="signal-meta">環境音保持 55 dB 以下。</div>
                </div>
                <div className="signal-card">
                  <div className="signal-label">錨定語</div>
                  <div className="signal-value">「我可以溫柔地看著它。」</div>
                  <div className="signal-meta">昨晚使用兩次，感覺穩定。</div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="section-header">
                <h3>每週委託</h3>
                <span className="pill">3 個任務</span>
              </div>
              <div className="quest-list">
                {quests.map((quest) => (
                  <div className="quest-row" key={quest.title}>
                    <div>
                      <div className="quest-title">{quest.title}</div>
                      <div className="quest-meta">{quest.meta}</div>
                    </div>
                    <div className="quest-progress">
                      <div className="meter meter-soft">
                        <div className="meter-fill" style={{ width: `${quest.progress * 100}%` }} />
                      </div>
                      <span className="quest-impact">{quest.impact}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="section-header">
                <h3>支援團</h3>
                <button className="ghost-button" type="button">
                  邀請成員
                </button>
              </div>
              <div className="companion-list">
                {circle.map((ally) => (
                  <div className="companion" key={ally.name}>
                    <div className="companion-avatar" style={{ backgroundImage: `url(${ally.avatar})` }} />
                    <div>
                      <div className="companion-name">{ally.name}</div>
                      <div className="companion-role">{ally.role}</div>
                      <div className="companion-status">{ally.status}</div>
                    </div>
                    <button className="link-button" type="button">
                      私訊
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Topbar } from '@/components/Topbar';
import { getPosts, getRoles, formatCount } from '@/lib/api';
import { seedPosts, seedRoles } from '@/lib/seeds';

const moodFilters = ['溫柔', '浪漫', '危險', '治癒', '離家'];

export default async function ExplorePage() {
  const [roles, posts] = await Promise.all([getRoles(), getPosts()]);

  const heroRole = roles[0] ?? seedRoles[0];
  const story = posts[0] ?? seedPosts[0];
  const featured = posts.slice(0, 3);

  const heroStack = [
    { title: '今晚心跳', subtitle: '匹配你的情緒曲線', image: heroRole.avatar },
    { title: '新劇本', subtitle: story.title, image: story.images[0] },
    { title: '連載事件', subtitle: featured[1]?.title ?? '探索更多', image: featured[1]?.images[0] ?? story.images[0] }
  ];

  return (
    <AppShell>
      <Topbar />

      <section className="view">
        <div className="hero-grid">
          <div className="hero-card hero-neon">
            <div className="hero-badge">乙女主選</div>
            <div className="hero-content">
              <h1 className="hero-title">今晚，要和誰心跳同步？</h1>
              <p className="hero-text">挑一段劇情、進一座夢境，AI 讓偏愛即刻發生。</p>
              <div className="hero-actions">
                <button className="primary-button">立即進入</button>
                <button className="ghost-button">查看主題</button>
              </div>
              <div className="hero-stats">
                <span>偏愛值 +12%</span>
                <span>劇情存檔 18</span>
                <span>心跳連線 04</span>
              </div>
            </div>
            <div className="hero-image" style={{ backgroundImage: `url(${heroRole.heroImage})` }} />
            <div className="hero-orb" />
            <div className="hero-ribbon">Wondera</div>
          </div>

          <div className="hero-stack">
            <div className="stack-card">
              <div className="stack-title">今日靈感列車</div>
              <div className="stack-body">
                {heroStack.map((item) => (
                  <div className="stack-item" key={item.title}>
                    <div className="stack-avatar" style={{ backgroundImage: `url(${item.image})` }} />
                    <div className="stack-info">
                      <h4>{item.title}</h4>
                      <p>{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="stack-card">
              <div className="stack-title">心情濾鏡</div>
              <div className="chip-row">
                {moodFilters.map((mood) => (
                  <span key={mood} className={`chip ${mood === '溫柔' ? 'chip-active' : ''}`}>
                    {mood}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h2>角色召喚</h2>
            <Link className="link-button" href="/roles">
              全部角色
            </Link>
          </div>
          <div className="card-grid">
            {roles.map((role) => (
              <Link className="role-card role-vapor" href={`/roles/${role.id}`} key={role.id}>
                <div className="role-image" style={{ backgroundImage: `url(${role.heroImage})` }} />
                <div className="role-body">
                  <div className="role-title">{role.name}</div>
                  <div className="role-sub">
                    {role.title} · {role.city}
                  </div>
                  <div className="role-meta">
                    <span>{role.mood}</span>
                    <span>{formatCount(role.likes)} 喜歡</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h2>事件流</h2>
            <Link className="link-button" href="/feed">
              打開劇情河
            </Link>
          </div>
          <div className="feed-row">
            {featured.map((post) => (
              <Link className="feed-card" href={`/feed/${post.id}`} key={post.id}>
                <div className="feed-image" style={{ backgroundImage: `url(${post.images[0]})` }} />
                <div className="feed-copy">
                  <div className="feed-tag">{post.tags.join(' / ')}</div>
                  <h3 className="feed-title">{post.title}</h3>
                  <p className="feed-meta">
                    {post.location} · {formatCount(post.stats.likes)} 喜歡
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

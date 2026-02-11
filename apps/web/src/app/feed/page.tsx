import { AppShell } from '@/components/AppShell';
import { Topbar } from '@/components/Topbar';
import { getPosts } from '@/lib/api';
import { ShortsStream } from './shorts-stream';

export default async function FeedPage() {
  const posts = await getPosts();

  return (
    <AppShell>
      <Topbar />
      <div className="view">
        <div className="section-header">
          <div>
            <p className="feed-eyebrow">Wondera · Shorts</p>
            <h2>無限滑的 Shorts 流</h2>
            <p className="feed-sub">像 YouTube Shorts 一樣一直往下刷，更多視頻 / 圖像筆記會即時補上。</p>
          </div>
        </div>
        <ShortsStream initialPosts={posts} />
      </div>
    </AppShell>
  );
}

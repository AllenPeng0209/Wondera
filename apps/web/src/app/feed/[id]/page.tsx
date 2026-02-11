import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Topbar } from '@/components/Topbar';
import { getPosts, formatCount } from '@/lib/api';

type Props = { params: { id: string } };

export default async function FeedDetailPage({ params }: Props) {
  const posts = await getPosts();
  const post = posts.find((p) => p.id === params.id);
  if (!post) return notFound();

  return (
    <AppShell>
      <Topbar />
      <div className="view">
        <div className="detail-card">
          <div className="detail-header">
            <div className="detail-tag">{post.location}</div>
            <h2>{post.title}</h2>
            <p className="list-meta">{post.summary}</p>
          </div>
          <div
            className="masonry-image"
            style={{ height: 260, backgroundImage: `url(${post.images[0]})`, borderRadius: 18 }}
          />
          <div className="detail-meta">
            {post.author?.name ?? '匿名'} · {formatCount(post.stats.likes)} 喜歡 · {formatCount(post.stats.comments ?? 0)} 則留言
          </div>
          <div className="detail-body">
            {(post.content ?? [post.summary]).map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Post } from '@/types/content';
import { formatCount } from '@/lib/api';

type Props = { initialPosts: Post[] };

export function ShortsStream({ initialPosts }: Props) {
  const [batches, setBatches] = useState<Post[][]>([initialPosts]);
  const [loading, setLoading] = useState(false);
  const batchIndexRef = useRef(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const flattened = useMemo(() => batches.flat(), [batches]);

  const loadMore = useCallback(async () => {
    setLoading(true);
    const nextBatchIndex = batchIndexRef.current;

    // Simulate a network delay for UX realism
    await new Promise((resolve) => setTimeout(resolve, 300));

    const nextBatch = initialPosts.map((post, idx) => ({
      ...post,
      id: `${post.id}-b${nextBatchIndex}-${idx}`,
      stats: {
        ...post.stats,
        likes: post.stats.likes + 50 * nextBatchIndex + idx * 3,
        comments: (post.stats.comments ?? 0) + 8 * nextBatchIndex + idx
      }
    }));

    setBatches((prev) => [...prev, nextBatch]);
    batchIndexRef.current += 1;
    setLoading(false);
  }, [initialPosts]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && !loading) {
          void loadMore();
        }
      },
      { rootMargin: '140px', threshold: 0.6, root: containerRef.current ?? undefined }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loading, loadMore]);

  return (
    <div className="shorts-stream" ref={containerRef}>
      <div className="shorts-stack">
        {flattened.map((post) => (
          <article className="shorts-card" key={post.id}>
            <div className="shorts-video" style={{ backgroundImage: `url(${post.images[0]})` }}>
              <div className="shorts-gradient" />
              <div className="shorts-info">
                <div className="shorts-author">
                  <div
                    className="shorts-avatar"
                    style={{ backgroundImage: post.author?.avatar ? `url(${post.author.avatar})` : undefined }}
                  />
                  <div>
                    <p className="shorts-name">{post.author?.name ?? '匿名作者'}</p>
                    <p className="shorts-handle">{post.author?.label ?? 'Wondera Shorts'}</p>
                  </div>
                </div>
                <h3 className="shorts-title">{post.title}</h3>
                <p className="shorts-summary">{post.summary}</p>
                <div className="shorts-tags">
                  {(post.tags ?? []).slice(0, 3).map((tag) => (
                    <span key={tag} className="shorts-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="shorts-actions">
                <button className="shorts-action">❤ {formatCount(post.stats.likes)}</button>
                <button className="shorts-action">💬 {formatCount(post.stats.comments ?? 0)}</button>
                <button className="shorts-action">↗ 保存</button>
              </div>
              <Link className="shorts-cta" href={`/feed/${post.id}`}>
                查看詳情
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div ref={sentinelRef} className="shorts-sentinel">
        {loading ? '載入中…' : '繼續往下滑獲取更多'}
      </div>
    </div>
  );
}

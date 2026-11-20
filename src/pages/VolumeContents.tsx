import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getArticlesForVolume, getVolume } from '@/data/volumes';
import { getAllBookmarks, getAllReadingProgress } from '@/lib/storage';
import type { Bookmark, ReadingProgress } from '@/types';

export function VolumeContents() {
  const { volumeId } = useParams<{ volumeId: string }>();
  const volume = getVolume(volumeId);
  const articles = getArticlesForVolume(volumeId ?? '');
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    void Promise.all([getAllReadingProgress(), getAllBookmarks()]).then(([p, b]) => {
      setProgress(p);
      setBookmarks(b);
    });
  }, []);

  if (!volume) {
    return (
      <div className="mx-auto max-w-reader px-5 py-10 sm:px-8">
        <p className="text-sm text-secondary dark:text-dark-secondary">没有找到这一卷。</p>
        <Link to="/" className="mt-3 inline-flex min-h-11 items-center text-sm text-moss dark:text-moss">
          返回目录
        </Link>
      </div>
    );
  }

  const completed = articles.filter((article) =>
    (progress.find((item) => item.articleId === article.id)?.scrollFraction ?? 0) >= 0.99,
  ).length;
  const bookmarkedIds = new Set(bookmarks.map((bookmark) => bookmark.articleId));

  return (
    <div className="mx-auto max-w-reader px-5 pb-8 pt-5 sm:px-8 sm:pt-7">
      <header className="mt-1 border-b border-ink/10 pb-4 dark:border-dark-line sm:pb-5">
        <h1 className="font-serif-cn text-[1.6rem] font-semibold leading-tight tracking-[0.06em] text-ink dark:text-dark-ink sm:text-[1.8rem]">
          {volume.label}
        </h1>
        <p className="mt-2 font-serif-cn text-[10.5px] tracking-[0.16em] text-secondary dark:text-dark-secondary">
          {articles.length} 篇{completed > 0 ? ` · 已读完 ${completed} 篇` : ''}
        </p>
      </header>

      <ol className="divide-y divide-ink/8 dark:divide-dark-line">
        {articles.map((article, index) => {
          const articleProgress = progress.find((item) => item.articleId === article.id)?.scrollFraction ?? 0;
          const isComplete = articleProgress >= 0.99;

          return (
            <li key={article.id}>
              <Link
                to={`/read/${article.id}`}
                className="group flex min-h-[68px] items-start gap-3 py-3.5 transition-colors active:bg-moss/5"
              >
                <span className="w-7 shrink-0 pt-1 text-right font-serif-cn text-[10.5px] tabular-nums tracking-[0.05em] text-secondary/70 dark:text-dark-secondary/70">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif-cn text-[15.5px] leading-[1.55] tracking-[0.01em] text-ink group-hover:text-cinnabar dark:text-dark-ink dark:group-hover:text-cinnabar">
                    {article.title}
                  </span>
                  <span className="mt-1 flex items-center gap-2 font-serif-cn text-[10.5px] tracking-[0.06em] text-secondary dark:text-dark-secondary">
                    <span>{article.writtenAt}</span>
                    {isComplete && <span className="text-moss dark:text-moss">已读完</span>}
                    {!isComplete && articleProgress > 0.01 && (
                      <span>{Math.round(articleProgress * 100)}%</span>
                    )}
                  </span>
                  {articleProgress > 0.01 && !isComplete && (
                    <span className="mt-2 block h-[2px] max-w-24 bg-ink/8 dark:bg-dark-line">
                      <span className="block h-full bg-cinnabar/75" style={{ width: `${articleProgress * 100}%` }} />
                    </span>
                  )}
                </span>
                {bookmarkedIds.has(article.id) && (
                  <span className="pt-1 text-xs text-cinnabar" aria-label="已收藏">★</span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

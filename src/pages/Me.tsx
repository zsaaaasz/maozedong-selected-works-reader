import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ARTICLES } from '@/data/manifest';
import {
  getAllBookmarks,
  clearBookmark,
  getAllReadingProgress,
  getDailyStats,
  getAllNotes,
} from '@/lib/storage';
import type { Bookmark, ReadingProgress, DailyStats, ReadingNote } from '@/types';

/**
 * Me — 我. Reading stats + history + bookmarks + settings.
 */
export function Me() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [notes, setNotes] = useState<ReadingNote[]>([]);
  useEffect(() => {
    void Promise.all([
      getAllBookmarks(),
      getAllReadingProgress(),
      getDailyStats(7),
      getAllNotes(),
    ]).then(([b, p, d, n]) => {
      setBookmarks(b);
      setProgress(p);
      setDailyStats(d);
      setNotes(n);
    });
  }, []);

  const onRemove = async (articleId: string) => {
    await clearBookmark(articleId);
    setBookmarks((bs) => bs.filter((b) => b.articleId !== articleId));
  };

  // Filter out progress whose articleId is no longer in the manifest
  // (orphans from removed articles used to inflate totalMinRead).
  const validArticleIds = new Set(ARTICLES.map((a) => a.id));
  const validProgress = progress.filter((p) => validArticleIds.has(p.articleId));

  // Stats
  const totalRead = validProgress.filter((p) => p.scrollFraction >= 0.9).length;
  const totalMinRead = Math.round(
    validProgress.reduce((sum, p) => sum + (p.totalDurationMs ?? 0), 0) / 60_000,
  );
  const weekMin = Math.round(
    dailyStats.reduce((sum, d) => sum + d.durationMs, 0) / 60_000,
  );
  const weekArticles = new Set(dailyStats.flatMap((d) => d.articleIds)).size;

  // Last 5 reading sessions (sorted by updatedAt)
  const recentProgress = [...validProgress]
    .filter((p) => p.scrollFraction > 0.01)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8">
      <header>
        <h1 className="font-serif-cn text-[1.85rem] font-semibold tracking-[0.08em] text-ink dark:text-dark-ink sm:text-[2.15rem]">
          我的
        </h1>
      </header>

      {/* 本周阅读 */}
      <section>
        <SectionTitle>本周阅读</SectionTitle>
        <div className="rounded-card-lg border border-ink/8 dark:border-dark-line
                        bg-white/60 dark:bg-dark-surface p-3 sm:p-5">
          <div className="flex items-baseline gap-4">
            <div>
              <p className="text-[2rem] leading-none sm:text-[2.15rem] font-serif-cn text-ink dark:text-dark-ink tabular-nums">
                {weekMin}
              </p>
              <p className="text-[15px] leading-tight text-secondary dark:text-dark-secondary">
                分钟
              </p>
            </div>
            <div>
              <p className="text-[2rem] leading-none sm:text-[2.15rem] font-serif-cn text-ink dark:text-dark-ink tabular-nums">
                {weekArticles}
              </p>
              <p className="text-[15px] leading-tight text-secondary dark:text-dark-secondary">
                篇
              </p>
            </div>
          </div>
          <WeeklyBarChart stats={dailyStats} />
        </div>
      </section>

      {/* 累计 */}
      <section>
        <SectionTitle>累计</SectionTitle>
        <p className="text-[16px] leading-[1.8] text-ink dark:text-dark-ink">
          {ARTICLES.length} 篇中已读 {totalRead} 篇，累计 {totalMinRead} 分钟
        </p>
        <p className="text-[15px] leading-[1.8] text-secondary dark:text-dark-secondary">
          收藏 {bookmarks.length} 篇 · 笔记 {notes.length} 条
        </p>
        <div className="mt-2 h-1.5 bg-ink/5 dark:bg-dark-ink/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-cinnabar transition-all"
            style={{ width: `${(totalRead / ARTICLES.length) * 100}%` }}
          />
        </div>
      </section>

      {/* 最近阅读 */}
      {recentProgress.length > 0 && (
        <section>
          <SectionTitle>最近阅读</SectionTitle>
          <ul className="space-y-1.5">
            {recentProgress.map((p) => {
              const a = ARTICLES.find((x) => x.id === p.articleId);
              if (!a) return null;
              return (
                <li key={p.articleId}>
                  <Link
                    to={`/read/${p.articleId}`}
                    className="flex items-center justify-between rounded-card border border-ink/8
                         bg-white/50 dark:border-dark-line dark:bg-dark-surface px-3 py-2.5 min-h-[44px]
                         hover:border-cinnabar/40 active:scale-[0.99] transition-all"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="font-serif-cn text-[18px] sm:text-[19px] text-ink dark:text-dark-ink truncate block">
                        {a.title}
                      </span>
                      <span className="text-[14px] text-secondary dark:text-dark-secondary">
                        {Math.round(p.scrollFraction * 100)}% · {timeAgo(p.updatedAt)}
                      </span>
                    </span>
                    <div className="ml-2 w-12 h-1 bg-ink/10 dark:bg-dark-ink/20 rounded-full overflow-hidden shrink-0">
                      <div
                        className="h-full bg-cinnabar"
                        style={{ width: `${Math.round(p.scrollFraction * 100)}%` }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 收藏 */}
      <section>
        <SectionTitle>收藏 ({bookmarks.length})</SectionTitle>
        {bookmarks.length === 0 ? (
          <p className="text-[16px] leading-[1.8] text-secondary dark:text-dark-secondary py-2">
            还没有收藏。在文章页点 ★ 收藏当前阅读位置。
          </p>
        ) : (
          <ul className="space-y-1.5">
            {bookmarks.map((b) => {
              const article = ARTICLES.find((a) => a.id === b.articleId);
              if (!article) return null;
              return (
                <li
                  key={b.articleId}
                  className="flex items-center justify-between rounded-card border border-ink/8
                             bg-white/50 dark:border-dark-line dark:bg-dark-surface px-3 py-2.5 min-h-[44px]"
                >
                  <Link
                    to={`/read/${b.articleId}`}
                    className="flex-1 min-w-0 font-serif-cn text-[18px] sm:text-[19px] text-ink dark:text-dark-ink hover:text-cinnabar transition-colors truncate"
                  >
                    {article.title}
                  </Link>
                  <button
                    onClick={() => void onRemove(b.articleId)}
                    className="text-base text-secondary hover:text-cinnabar transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="移除收藏"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 我的笔记 */}
      <section>
        <SectionTitle>我的笔记 ({notes.length})</SectionTitle>
        {notes.length === 0 ? (
          <p className="text-[16px] leading-[1.8] text-secondary dark:text-dark-secondary py-2">
            阅读正文时长按选择文字，再点“记笔记”。
          </p>
        ) : (
          <ul className="space-y-1.5">
            {notes.slice(0, 30).map((note) => {
              const article = ARTICLES.find((a) => a.id === note.articleId);
              if (!article) return null;
              return (
                <li key={note.id}>
                  <Link
                    to={`/read/${note.articleId}#${note.paragraphId}`}
                    state={{
                      from: '/me',
                      openNotes: true,
                      noteId: note.id,
                      quote: note.quote,
                      startOffset: note.startOffset,
                    }}
                    className="block rounded-card border border-ink/8 dark:border-dark-line
                               bg-white/50 dark:bg-dark-surface px-3 py-2.5
                               hover:border-cinnabar/40 transition-colors"
                  >
                    <span className="block text-[14px] text-cinnabar/85">{article.title}</span>
                    <span className="mt-1 block text-[16px] leading-[1.75] text-ink dark:text-dark-ink line-clamp-2 whitespace-pre-wrap">
                      {note.content}
                    </span>
                    <span className="mt-1 block text-[13.5px] text-secondary dark:text-dark-secondary">
                      {new Date(note.updatedAt).toLocaleString('zh-CN')}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {notes.length > 30 && (
          <p className="mt-2 text-[14px] text-secondary dark:text-dark-secondary">显示最近 30 条</p>
        )}
      </section>

      {/* 本机数据说明 */}
      <section>
        <p className="text-[15px] leading-[1.8] text-secondary dark:text-dark-secondary">
          阅读进度、书签和笔记保存在这台设备。
        </p>
        <Link
          to="/privacy"
          className="mt-2 inline-flex min-h-[44px] items-center text-[16px] text-cinnabar/85 transition-colors hover:text-cinnabar"
        >
          本地数据与隐私 →
        </Link>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3.5 flex items-center gap-2.5 font-serif-cn text-[19px] font-semibold tracking-[0.05em] text-ink/90 dark:text-dark-ink/90">
      <span className="h-[22px] w-[3px] rounded-full bg-cinnabar" aria-hidden />
      {children}
    </h2>
  );
}

function WeeklyBarChart({ stats }: { stats: DailyStats[] }) {
  // Build last 7 days, fill missing with 0
  const days: { date: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const stat = stats.find((s) => s.date === dateStr);
    days.push({ date: dateStr, minutes: Math.round((stat?.durationMs ?? 0) / 60_000) });
  }
  const max = Math.max(1, ...days.map((d) => d.minutes));
  const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
  return (
    <div className="mt-2 flex h-14 items-end gap-1.5">
      {days.map((d, i) => {
        const date = new Date(d.date);
        const dow = (date.getDay() + 6) % 7; // Mon=0
        const today = i === 6;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex-1 flex items-end">
              <div
                className={[
                  'w-full rounded-t transition-all',
                  d.minutes > 0
                    ? today
                      ? 'bg-cinnabar'
                      : 'bg-cinnabar/40'
                    : 'bg-ink/5 dark:bg-dark-ink/20',
                ].join(' ')}
                style={{ height: `${(d.minutes / max) * 100}%`, minHeight: '4px' }}
                title={`${d.date}: ${d.minutes} 分钟`}
              />
            </div>
            <span
              className={[
                'text-[13.5px] tabular-nums',
                today ? 'text-cinnabar font-medium' : 'text-secondary dark:text-dark-secondary',
              ].join(' ')}
            >
              {dayLabels[dow]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

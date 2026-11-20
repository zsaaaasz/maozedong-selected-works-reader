import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllNotes } from '@/lib/storage';
import type { ReadingNote } from '@/types';
import { ARTICLES } from '@/data/manifest';

export function Notes() {
  const [notes, setNotes] = useState<ReadingNote[]>([]);

  useEffect(() => {
    void getAllNotes().then(setNotes);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-5 sm:py-7">
      <header className="mb-5">
        <h1 className="font-serif-cn text-[1.85rem] font-semibold tracking-[0.08em] text-ink dark:text-dark-ink sm:text-[2.15rem]">
          我的笔记
        </h1>
        <p className="mt-2 font-serif-cn text-[12px] tracking-[0.14em] text-secondary dark:text-dark-secondary">
          共 {notes.length} 条 · 仅保存在这台设备
        </p>
      </header>

      {notes.length === 0 ? (
        <div className="rounded-card-lg border border-ink/8 dark:border-dark-line bg-white/45 dark:bg-dark-surface p-5">
          <p className="font-serif-cn text-[17px] text-ink dark:text-dark-ink">把读到的想法留下来。</p>
          <p className="mt-2 text-[14.5px] leading-[1.8] text-secondary dark:text-dark-secondary">
            打开文章，长按选择想记录的文字，再点“记笔记”。
          </p>
          <Link to="/" className="mt-3 inline-flex min-h-[44px] items-center text-[14.5px] text-cinnabar">
            去书架阅读 →
          </Link>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {notes.map((note) => {
            const article = ARTICLES.find((item) => item.id === note.articleId);
            if (!article) return null;
            return (
              <li key={note.id}>
                <Link
                  to={`/read/${note.articleId}#${note.paragraphId}`}
                  state={{
                    from: '/notes',
                    openNotes: true,
                    noteId: note.id,
                    quote: note.quote,
                    startOffset: note.startOffset,
                  }}
                  className="block rounded-card-lg border border-ink/8 dark:border-dark-line
                             bg-white/50 dark:bg-dark-surface px-4 py-3
                             hover:border-cinnabar/40 active:scale-[.995] transition-all"
                >
                  <span className="text-[12px] text-cinnabar/85">{article.title}</span>
                  {note.quote && (
                    <span className="mt-1 block font-serif-cn text-[13.5px] leading-[1.8] text-secondary dark:text-dark-secondary line-clamp-2">
                      “{note.quote}”
                    </span>
                  )}
                  <span className="mt-2 block whitespace-pre-wrap text-[14.5px] leading-[1.85] text-ink dark:text-dark-ink line-clamp-4">
                    {note.content}
                  </span>
                  <span className="mt-2 block text-[11px] text-secondary dark:text-dark-secondary">
                    {new Date(note.updatedAt).toLocaleString('zh-CN')} · 点按回到原文
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

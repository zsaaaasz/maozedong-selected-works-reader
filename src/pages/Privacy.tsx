import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clearAllLocalData, getAllBookmarks, getAllNotes, getAllReadingProgress } from '@/lib/storage';

export function Privacy() {
  const [counts, setCounts] = useState({ notes: 0, bookmarks: 0, progress: 0 });
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [notes, bookmarks, progress] = await Promise.all([
      getAllNotes(),
      getAllBookmarks(),
      getAllReadingProgress(),
    ]);
    setCounts({ notes: notes.length, bookmarks: bookmarks.length, progress: progress.length });
  };

  useEffect(() => { void refresh(); }, []);

  const clearData = async () => {
    if (!window.confirm('清除本机保存的笔记、书签和阅读进度？此操作不可撤销。')) return;
    setBusy(true);
    await clearAllLocalData();
    await refresh();
    setBusy(false);
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10 text-ink dark:text-dark-ink">
      <Link to="/me" className="inline-flex min-h-[44px] items-center text-sm text-secondary hover:text-cinnabar dark:text-dark-secondary">
        ← 返回“我的”
      </Link>
      <h1 className="mt-3 font-serif-cn text-[1.75rem] font-semibold tracking-[0.08em]">本地数据与隐私</h1>

      <div className="mt-6 space-y-5 text-sm leading-7">
        <section>
          <h2 className="font-serif-cn text-[15px] font-semibold tracking-[0.06em]">数据保存在本机</h2>
          <p className="mt-1 text-secondary dark:text-dark-secondary">
            阅读进度、书签和笔记保存在此 App 的本地存储中。应用没有账号或云同步功能；卸载 App 会删除这些数据。
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-secondary dark:text-dark-secondary">
            <li>笔记：{counts.notes} 条</li>
            <li>书签：{counts.bookmarks} 条</li>
            <li>阅读进度：{counts.progress} 篇</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif-cn text-[15px] font-semibold tracking-[0.06em]">书籍文本</h2>
          <p className="mt-1 text-secondary dark:text-dark-secondary">
            App 内置四卷、159 篇文章，可离线阅读。
          </p>
        </section>

        <section>
          <h2 className="font-serif-cn text-[15px] font-semibold tracking-[0.06em]">清除本地数据</h2>
          <p className="mt-1 text-secondary dark:text-dark-secondary">
            清除后，笔记、书签、阅读进度和统计无法恢复。书籍文本仍保留在 App 中。
          </p>
          <button
            type="button"
            onClick={() => void clearData()}
            disabled={busy}
            className="mt-3 min-h-[44px] rounded-full bg-cinnabar px-5 font-serif-cn text-sm tracking-[0.06em] text-paper disabled:opacity-50"
          >
            {busy ? '正在清除…' : '清除本机数据'}
          </button>
        </section>
      </div>
    </article>
  );
}

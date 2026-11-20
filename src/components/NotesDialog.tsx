import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReadingNote } from '@/types';
import { deleteNote, getArticleNotes, saveNote } from '@/lib/storage';

export function NotesDialog({
  articleId,
  articleTitle,
  paragraphId,
  excerpt,
  startOffset,
  endOffset,
  initialNoteId,
  onClose,
}: {
  articleId: string;
  articleTitle: string;
  paragraphId: string;
  excerpt: string;
  startOffset?: number;
  endOffset?: number;
  initialNoteId?: string;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<ReadingNote[]>([]);
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getArticleNotes(articleId).then((loaded) => {
      setNotes(loaded);
      if (initialNoteId) {
        const initial = loaded.find((note) => note.id === initialNoteId);
        if (initial) {
          setEditingId(initial.id);
          setContent(initial.content);
        }
      }
    });
  }, [articleId, initialNoteId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const editing = notes.find((note) => note.id === editingId);

  const startNew = () => {
    setEditingId(null);
    setContent('');
  };

  const saveCurrent = async () => {
    const text = content.trim();
    if (!text || saving) return;
    setSaving(true);
    const now = new Date().toISOString();
    const old = notes.find((note) => note.id === editingId);
    const note: ReadingNote = {
      id: old?.id ?? makeId(),
      articleId,
      paragraphId: old?.paragraphId ?? paragraphId,
      quote: old?.quote ?? excerpt,
      startOffset: old?.startOffset ?? startOffset,
      endOffset: old?.endOffset ?? endOffset,
      content: text,
      createdAt: old?.createdAt ?? now,
      updatedAt: now,
    };
    await saveNote(note);
    setNotes(await getArticleNotes(articleId));
    setEditingId(null);
    setContent('');
    setSaving(false);
  };

  const remove = async (note: ReadingNote) => {
    if (!window.confirm('删除这条笔记？')) return;
    await deleteNote(note.id);
    setNotes(await getArticleNotes(articleId));
    if (editingId === note.id) startNew();
  };

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        aria-label="关闭笔记"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-ink/35 dark:bg-dark-ink/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label="阅读笔记"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[88dvh]
                   rounded-t-2xl border-t border-ink/10 dark:border-dark-line
                   bg-paper dark:bg-dark-paper flex flex-col
                   pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-ink/15 dark:bg-dark-ink/20" aria-hidden />
        <div className="flex items-center justify-between px-4 py-2 border-b border-ink/8 dark:border-dark-line shrink-0">
          <div>
            <h2 className="font-serif-cn text-base text-ink dark:text-dark-ink">阅读笔记</h2>
            <p className="text-[11px] text-secondary dark:text-dark-secondary">{articleTitle} · 仅保存在本机</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] text-secondary hover:text-ink dark:hover:text-dark-ink"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="rounded-card border border-moss/20 bg-moss/5 dark:bg-moss/10 p-3">
            <p className="text-[10px] text-moss mb-1">摘录</p>
            <p className="font-serif-cn text-[13px] leading-relaxed text-ink dark:text-dark-ink line-clamp-4">
              {editing?.quote || excerpt || '当前阅读位置'}
            </p>
          </div>

          <div>
            <label htmlFor="reading-note" className="block text-xs text-secondary dark:text-dark-secondary mb-1.5">
              {editing ? '编辑笔记' : '写下你的想法'}
            </label>
            <textarea
              id="reading-note"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="记录疑问、联想或读后感……"
              rows={4}
              className="w-full rounded-card border border-ink/12 dark:border-dark-line
                         bg-white/70 dark:bg-dark-ink/10 px-3 py-2.5 text-sm
                         text-ink dark:text-dark-ink placeholder:text-secondary/60
                         resize-y focus:border-cinnabar/50 outline-none"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => void saveCurrent()}
                disabled={!content.trim() || saving}
                className="min-h-[40px] rounded-card bg-cinnabar px-4 text-sm text-paper
                           hover:bg-cinnabar/90 active:scale-[.98] transition-all
                           disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {saving ? '保存中…' : editing ? '保存修改' : '保存笔记'}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={startNew}
                  className="min-h-[40px] rounded-card border border-ink/10 dark:border-dark-line px-3 text-sm"
                >
                  新建
                </button>
              )}
            </div>
          </div>

          <section className="border-t border-ink/8 dark:border-dark-line pt-3">
            <h3 className="text-xs font-medium text-secondary dark:text-dark-secondary mb-2">
              本篇笔记（{notes.length}）
            </h3>
            {notes.length === 0 ? (
              <p className="py-2 text-xs text-secondary dark:text-dark-secondary">还没有笔记。</p>
            ) : (
              <ul className="space-y-2">
                {notes.map((note) => (
                  <li key={note.id} className="rounded-card border border-ink/8 dark:border-dark-line bg-white/45 dark:bg-dark-surface p-3">
                    <button
                      type="button"
                      onClick={() => { setEditingId(note.id); setContent(note.content); }}
                      className="block w-full text-left"
                    >
                      <p className="text-[10px] text-secondary dark:text-dark-secondary mb-1">
                        {new Date(note.updatedAt).toLocaleString('zh-CN')}
                      </p>
                      <p className="text-sm text-ink dark:text-dark-ink whitespace-pre-wrap line-clamp-4">{note.content}</p>
                    </button>
                    <div className="mt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void remove(note)}
                        className="min-h-[32px] px-2 text-[11px] text-secondary hover:text-cinnabar"
                      >
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

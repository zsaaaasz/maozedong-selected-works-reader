import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useArticle } from '@/hooks/useArticle';
import {
  clearBookmark,
  getArticleNotes,
  getBookmark,
  getReadingProgress,
  recordSession,
  setBookmark,
  setReadingProgress,
} from '@/lib/storage';
import { ARTICLES } from '@/data/manifest';
import { getVolumeForArticle } from '@/data/volumes';
import { findFootnoteReferences, findTextRange, footnoteNumberFromText } from '@/lib/footnotes';
import { ParagraphView } from '@/components/ParagraphView';
import { TopProgressBar } from '@/components/TopProgressBar';
import { NotesDialog } from '@/components/NotesDialog';
import type { Paragraph } from '@/types';

interface ExcerptTarget {
  paragraphId: string;
  quote: string;
  startOffset?: number;
  endOffset?: number;
}

interface ReaderNavigationState {
  from?: string;
  openNotes?: boolean;
  noteId?: string;
  startOffset?: number;
}

export function Reader() {
  const { id = '' } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationState = location.state as ReaderNavigationState | null;
  const { article, loading, error } = useArticle(id);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [activeParagraphId, setActiveParagraphId] = useState('');
  const [selectedExcerpt, setSelectedExcerpt] = useState<ExcerptTarget | null>(null);
  const [noteTarget, setNoteTarget] = useState<ExcerptTarget | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [footnotesOpen, setFootnotesOpen] = useState(true);
  const articleRef = useRef<HTMLElement | null>(null);
  const lastSaveRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const highlightTimerRef = useRef<number | null>(null);
  const excerptCleanupRef = useRef<(() => void) | null>(null);
  /** 点按浮条时系统会清掉原生选区，这里用一个短暂的保护期挡住 selectionchange 的清空。 */
  const selectionGuardRef = useRef(0);

  const meta = article?.metadata;
  const primary = article?.translations['zh-CN'];
  const allParagraphs = primary?.paragraphs ?? [];
  const footnotes = useMemo(
    () => allParagraphs.filter((paragraph) => paragraph.kind === 'note'),
    [allParagraphs],
  );
  const bodyParagraphs = useMemo(
    () => allParagraphs.filter(
      (paragraph) => paragraph.kind !== 'note'
        && !(paragraph.kind === 'heading' && paragraph.text.trim() === '注释'),
    ),
    [allParagraphs],
  );
  const footnoteNumbers = useMemo(
    () => new Set(footnotes.map((paragraph) => footnoteNumberFromText(paragraph.text)).filter(
      (number): number is number => number !== null,
    )),
    [footnotes],
  );
  const footnoteReferences = useMemo(
    () => findFootnoteReferences(bodyParagraphs, footnoteNumbers),
    [bodyParagraphs, footnoteNumbers],
  );
  const referencesByPosition = new Map(
    footnoteReferences.map((reference) => [
      `${reference.paragraphId}:${reference.offset}`,
      reference.id,
    ]),
  );
  const firstReferenceByNumber = new Map<number, string>();
  for (const reference of footnoteReferences) {
    if (!firstReferenceByNumber.has(reference.number)) {
      firstReferenceByNumber.set(reference.number, reference.id);
    }
  }

  const currentIndex = useMemo(() => ARTICLES.findIndex((item) => item.id === id), [id]);
  const previousArticle = currentIndex > 0 ? ARTICLES[currentIndex - 1] : null;
  const nextArticle = currentIndex >= 0 && currentIndex < ARTICLES.length - 1
    ? ARTICLES[currentIndex + 1]
    : null;
  const volume = getVolumeForArticle(meta);
  const backPath = navigationState?.from ?? `/volume/${volume.id}`;

  useEffect(() => {
    if (meta?.title) document.title = `${meta.title} · 毛泽东选集`;
  }, [meta?.title]);

  useEffect(() => {
    if (!id) return;
    void getBookmark(id).then((bookmark) => setIsBookmarked(Boolean(bookmark)));
    sessionStartRef.current = Date.now();
    setActiveParagraphId('');
    setSelectedExcerpt(null);
    setNoteTarget(null);
    setShowNotes(false);
    return () => {
      const durationMs = Date.now() - sessionStartRef.current;
      if (durationMs > 5_000) {
        void recordSession({
          articleId: id,
          startedAt: new Date(sessionStartRef.current).toISOString(),
          durationMs,
        });
      }
    };
  }, [id]);

  useEffect(() => {
    if (!primary || !articleRef.current) return;
    const container = articleRef.current;
    let restored = false;
    let userTouched = false;
    let hasProgress = false;
    let baseDurationMs = 0;
    // 卸载时 React 会先清空 article 的子节点，scrollHeight 塌缩使 scrollTop 被钳到 0，
    // 所以滚动过程中就把进度记下来，卸载时用最后一份有效值，别现算。
    let lastFraction = 0;
    let lastParaId: string | undefined;

    const measureFraction = (): number | null => {
      if (!container.isConnected) return null;
      const scrollable = container.scrollHeight - container.clientHeight;
      if (scrollable <= 0) return null;
      return container.scrollTop / scrollable;
    };

    const firstVisibleParaId = (): string | undefined => {
      if (!container.isConnected) return undefined;
      const paragraphs = container.querySelectorAll<HTMLElement>(
        '[data-selectable="true"][data-para-id]',
      );
      for (const paragraph of paragraphs) {
        if (paragraph.getBoundingClientRect().bottom >= 112) return paragraph.dataset.paraId;
      }
      return undefined;
    };

    const track = () => {
      const fraction = measureFraction();
      if (fraction !== null) lastFraction = Math.max(0, Math.min(1, fraction));
      const paraId = firstVisibleParaId();
      if (paraId) lastParaId = paraId;
    };

    const saveProgress = () => {
      if (!restored) return undefined;
      track();
      const fraction = lastFraction;
      // 只是打开文章、还没往下读时不要写入 0%，否则会把首页“续读”指到
      // 这篇刚点开又退出的文章，覆盖掉真正的阅读位置。
      if (fraction <= 0 && !hasProgress) return undefined;
      if (lastParaId) setActiveParagraphId(lastParaId);
      hasProgress = true;
      return setReadingProgress({
        articleId: id,
        scrollFraction: fraction,
        updatedAt: new Date().toISOString(),
        lastParagraphId: lastParaId,
        // 累计时长跟着进度一起写，避免 recordSession 另做一次读改写。
        totalDurationMs: baseDurationMs + (Date.now() - sessionStartRef.current),
      });
    };

      void getReadingProgress(id).then((saved) => {
        if (saved && !userTouched && !location.hash && !navigationState?.openNotes) {
          // 优先按比例精确回位；没有比例时再退回段落锚点。
          if (saved.scrollFraction > 0.001) {
            const scrollable = container.scrollHeight - container.clientHeight;
            container.scrollTo({ top: Math.max(0, saved.scrollFraction * scrollable), behavior: 'auto' });
          } else if (saved.lastParagraphId) {
            const lastParagraph = container.querySelector<HTMLElement>(
              '[data-para-id="' + CSS.escape(saved.lastParagraphId) + '"]',
            );
            lastParagraph?.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
          lastFraction = saved.scrollFraction;
          lastParaId = saved.lastParagraphId;
        }
        if (saved) hasProgress = true;
        baseDurationMs = saved?.totalDurationMs ?? 0;
        restored = true;
        saveProgress();
      });
    const onScroll = () => {
      userTouched = true;
      track();
      const now = Date.now();
      if (now - lastSaveRef.current < 1_000) return;
      lastSaveRef.current = now;
      saveProgress();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveProgress();
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', saveProgress);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      saveProgress();
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', saveProgress);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [id, location.hash, navigationState?.openNotes, primary]);

  useEffect(() => {
    if (!article || !location.hash) return;
    const paragraphId = decodeURIComponent(location.hash.slice(1));
    const timer = window.setTimeout(() => {
      const target = articleRef.current?.querySelector<HTMLElement>(
        `[data-para-id="${CSS.escape(paragraphId)}"]`,
      );
      if (!target) return;
      excerptCleanupRef.current?.();
      excerptCleanupRef.current = null;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.classList.add('reader-note-highlight');

      const startOffset = navigationState?.startOffset;
      const quote = (location.state as { quote?: string } | null)?.quote;
      if (typeof startOffset === 'number' && quote) {
        const range = findTextRange(target, startOffset, startOffset + quote.length);
        if (range) excerptCleanupRef.current = flashExcerpt(target, range);
      }

      if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = window.setTimeout(() => {
        excerptCleanupRef.current?.();
        excerptCleanupRef.current = null;
        target.classList.remove('reader-note-highlight');
        highlightTimerRef.current = null;
      }, 1_800);
    }, 100);
    return () => {
      window.clearTimeout(timer);
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
      excerptCleanupRef.current?.();
      excerptCleanupRef.current = null;
    };
  }, [article, id, location.hash, location.key, location.state, navigationState?.startOffset, navigationState?.openNotes]);

  useEffect(() => {
    if (!article) return;
    let debounceTimer: number | null = null;
    const onSelectionChange = () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) {
          if (Date.now() < selectionGuardRef.current) return;
          setSelectedExcerpt(null);
          return;
        }
        const range = selection.getRangeAt(0);
        if (!articleRef.current?.contains(range.commonAncestorContainer)) {
          if (Date.now() < selectionGuardRef.current) return;
          setSelectedExcerpt(null);
          return;
        }
        const startNode = range.startContainer.nodeType === Node.ELEMENT_NODE
          ? range.startContainer as Element
          : range.startContainer.parentElement;
        const paragraph = startNode?.closest<HTMLElement>('[data-selectable="true"][data-para-id]')
          ?? startNode?.closest<HTMLElement>('[data-para-id]');
        if (!paragraph?.dataset.paraId) {
          if (Date.now() < selectionGuardRef.current) return;
          setSelectedExcerpt(null);
          return;
        }

        const rawQuote = selection.toString();
        const quote = rawQuote.trim();
        if (!quote || !quote.replace(/[\s。，、；：！？…—·．“”‘’《》〈〉（）()\-.,;:!?~"'*]/g, '')) {
          if (Date.now() < selectionGuardRef.current) return;
          setSelectedExcerpt(null);
          return;
        }
        const leadingWhitespace = rawQuote.indexOf(quote);
        const prefix = document.createRange();
        prefix.selectNodeContents(paragraph);
        prefix.setEnd(range.startContainer, range.startOffset);
        const startOffset = prefix.toString().length + Math.max(0, leadingWhitespace);
        const paragraphLength = paragraph.textContent?.length ?? startOffset;
        const endOffset = Math.min(paragraphLength, startOffset + quote.length);

        setSelectedExcerpt({
          paragraphId: paragraph.dataset.paraId,
          quote,
          startOffset,
          endOffset,
        });
      }, 120);
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
    };
  }, [article]);

  useEffect(() => {
    if (!article || !navigationState?.openNotes) return;
    let cancelled = false;
    void getArticleNotes(id).then((notes) => {
      if (cancelled) return;
      const note = notes.find((item) => item.id === navigationState.noteId);
      if (note) {
        setNoteTarget({
          paragraphId: note.paragraphId,
          quote: note.quote,
          startOffset: note.startOffset,
          endOffset: note.endOffset,
        });
      }
      setShowNotes(true);
    });
    return () => { cancelled = true; };
  }, [article, id, location.key, navigationState?.noteId, navigationState?.openNotes]);

  if (loading) {
    return <div className="px-5 py-12 text-sm text-secondary dark:text-dark-secondary">正在打开文章…</div>;
  }
  if (error || !article || !primary) {
    return (
      <div className="px-5 py-12">
        <p className="text-sm text-cinnabar">没有找到这篇文章。</p>
        <Link to="/" className="mt-3 inline-flex min-h-11 items-center text-sm text-moss dark:text-moss">
          返回目录
        </Link>
      </div>
    );
  }

  const openSelectedExcerpt = () => {
    if (!selectedExcerpt) return;
    // 收起系统选区工具条，避免它压在笔记面板上。
    window.getSelection()?.removeAllRanges();
    setActiveParagraphId(selectedExcerpt.paragraphId);
    setNoteTarget(selectedExcerpt);
    setSelectedExcerpt(null);
    setShowNotes(true);
  };

  const toggleBookmark = async () => {
    if (isBookmarked) {
      await clearBookmark(id);
      setIsBookmarked(false);
    } else {
      const fallback = bodyParagraphs.find((paragraph) => paragraph.kind === 'body')?.id
        ?? bodyParagraphs[0]?.id
        ?? '';
      await setBookmark({
        articleId: id,
        paragraphId: activeParagraphId || fallback,
        createdAt: new Date().toISOString(),
      });
      setIsBookmarked(true);
    }
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  };

  const scrollToFootnote = (number: number) => {
    articleRef.current?.querySelector<HTMLElement>(`#footnote-${number}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const scrollToReference = (referenceId: string | undefined) => {
    if (!referenceId) return;
    articleRef.current?.querySelector<HTMLElement>(`#${CSS.escape(referenceId)}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const noteExcerpt = noteTarget?.quote ?? '';

  return (
    <>
      <article
        ref={articleRef}
        className="app-surface mx-auto h-full max-w-3xl overflow-y-auto overscroll-y-contain px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-8"
      >
        <TopProgressBar containerRef={articleRef} />

        <div className="sticky top-0 z-20 -mx-5 flex min-h-[62px] items-center justify-between border-b border-ink/8 bg-paper/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-md dark:border-dark-line dark:bg-dark-paper/92 sm:-mx-8 sm:px-6">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink/85 transition-transform active:scale-95 dark:text-dark-ink/85"
            aria-label="返回目录"
          >
            <BackIcon />
          </button>
          <span className="min-w-0 flex-1 px-2 text-center">
            <span className="line-clamp-1 block font-serif-cn text-[15px] font-semibold leading-snug tracking-[0.02em] text-ink dark:text-dark-ink">
              {meta?.title}
            </span>
            <span className="mt-0.5 block font-serif-cn text-[10px] leading-tight tracking-[0.18em] text-secondary dark:text-dark-secondary">
              {volume.label}
            </span>
          </span>
          <button
            type="button"
            onClick={() => void toggleBookmark()}
            className={[
              'flex min-h-11 min-w-11 items-center justify-center rounded-full transition-[color,transform] active:scale-95',
              isBookmarked ? 'text-cinnabar' : 'text-secondary dark:text-dark-secondary',
            ].join(' ')}
            aria-label={isBookmarked ? '取消书签' : '添加书签'}
            aria-pressed={isBookmarked}
          >
            <BookmarkIcon active={isBookmarked} />
          </button>
        </div>

        <header className="pb-1 pt-6 sm:pt-8">
          <p className="font-serif-cn text-[11px] tracking-[0.14em] text-secondary dark:text-dark-secondary">
            {meta?.author}　{meta?.writtenAt}
          </p>
        </header>

        <section aria-label="文章正文">
          {bodyParagraphs.map((paragraph: Paragraph) => (
            <ParagraphView
              key={paragraph.id}
              p={paragraph}
              lang="zh-CN"
              footnoteNumbers={footnoteNumbers}
              footnoteReferenceIds={referencesByPosition}
              onFootnoteJump={scrollToFootnote}
            />
          ))}
        </section>

        {footnotes.length > 0 && (
          <section aria-labelledby="footnotes-heading" className="mt-14 border-t border-ink/12 pt-6 dark:border-dark-line sm:mt-16 sm:pt-7">
            <button
              type="button"
              onClick={() => setFootnotesOpen((open) => !open)}
              aria-expanded={footnotesOpen}
              className="flex min-h-9 w-full items-center justify-between gap-3 text-left"
            >
              <h2 id="footnotes-heading" className="font-serif-cn text-[15px] font-semibold tracking-[0.2em] text-ink dark:text-dark-ink">
                注释
              </h2>
              <ChevronIcon open={footnotesOpen} />
            </button>
            {footnotesOpen && (
              <ol className="mt-3 space-y-4">
                {footnotes.map((footnote) => {
                  const number = footnoteNumberFromText(footnote.text);
                  const body = footnote.text.replace(/^\s*〔\d+〕\s*/, '');
                  const referenceId = number === null ? undefined : firstReferenceByNumber.get(number);
                  return (
                    <li
                      key={footnote.id}
                      id={number === null ? undefined : `footnote-${number}`}
                      data-para-id={footnote.id}
                      className="scroll-mt-24 flex gap-3 text-[13.5px] leading-[1.95] text-secondary dark:text-dark-secondary"
                    >
                      <span className="mt-[0.1em] flex h-[1.55em] min-w-[1.55em] shrink-0 items-center justify-center rounded-full border border-cinnabar/45 px-[0.32em] font-serif-cn text-[0.78em] font-semibold leading-none text-cinnabar">
                        {number ?? '·'}
                      </span>
                      <span className="min-w-0 flex-1">
                        {body}
                        {referenceId && (
                          <button
                            type="button"
                            onClick={() => scrollToReference(referenceId)}
                            className="footnote-backlink ml-1 inline-flex min-h-8 min-w-8 items-center justify-center align-middle text-cinnabar"
                            aria-label={`返回正文注释标记${number}`}
                          >
                            ↩
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        )}

        <nav className="mt-14 flex justify-between gap-4 border-t border-ink/10 pt-5 text-sm dark:border-dark-line sm:mt-16 sm:pt-6">
          {previousArticle ? (
            <Link to={`/read/${previousArticle.id}`} state={{ from: backPath }} className="group min-w-0 flex-1">
              <span className="block font-serif-cn text-[10px] tracking-[0.16em] text-secondary dark:text-dark-secondary">上一篇</span>
              <span className="mt-1.5 block truncate font-serif-cn text-[14px] text-ink group-hover:text-cinnabar dark:text-dark-ink dark:group-hover:text-cinnabar">
                {previousArticle.title}
              </span>
            </Link>
          ) : <span className="flex-1" />}
          {nextArticle ? (
            <Link to={`/read/${nextArticle.id}`} state={{ from: backPath }} className="group min-w-0 flex-1 text-right">
              <span className="block font-serif-cn text-[10px] tracking-[0.16em] text-secondary dark:text-dark-secondary">下一篇</span>
              <span className="mt-1.5 block truncate font-serif-cn text-[14px] text-ink group-hover:text-cinnabar dark:text-dark-ink dark:group-hover:text-cinnabar">
                {nextArticle.title}
              </span>
            </Link>
          ) : <span className="flex-1" />}
        </nav>
      </article>

      {/* 贴底会落进系统手势区，手指一点就被判成上滑，所以抬到手势条之上。 */}
      {selectedExcerpt && !showNotes && (
        <div className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-reader items-center gap-3 px-4">
          <div className="flex min-h-14 min-w-0 flex-1 items-center rounded-[20px] border border-ink/10 bg-paper/95 px-3 shadow-[0_14px_36px_rgba(0,0,0,0.2)] backdrop-blur dark:border-[#493B37] dark:bg-[#211C1A]/95">
            <span className="line-clamp-2 min-w-0 flex-1 font-serif-cn text-xs leading-relaxed text-secondary dark:text-dark-secondary">
              {selectedExcerpt.quote}
            </span>
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                selectionGuardRef.current = Date.now() + 900;
              }}
              onClick={openSelectedExcerpt}
              className="ml-3 min-h-10 shrink-0 rounded-full bg-cinnabar px-4 text-sm font-medium text-white shadow-[0_4px_10px_rgba(190,45,46,0.25)] active:scale-95"
            >
              记笔记
            </button>
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                selectionGuardRef.current = Date.now() + 900;
              }}
              onClick={() => setSelectedExcerpt(null)}
              className="ml-1 flex min-h-10 min-w-8 items-center justify-center text-secondary dark:text-dark-secondary"
              aria-label="取消选中"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showNotes && noteTarget && (
        <NotesDialog
          articleId={id}
          articleTitle={article.metadata.title}
          paragraphId={noteTarget.paragraphId}
          excerpt={noteExcerpt}
          startOffset={noteTarget.startOffset}
          endOffset={noteTarget.endOffset}
          initialNoteId={navigationState?.openNotes ? navigationState.noteId : undefined}
          onClose={() => {
            setShowNotes(false);
            setNoteTarget(null);
          }}
        />
      )}
    </>
  );
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m14.5 5-7 7 7 7" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={[
        'text-secondary transition-transform duration-200 dark:text-dark-secondary',
        open ? 'rotate-180' : '',
      ].join(' ')}
    >
      <path d="m5 9 7 7 7-7" />
    </svg>
  );
}

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6.5 3.75h11a1 1 0 0 1 1 1V21l-6.5-4-6.5 4V4.75a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function flashExcerpt(
  paragraph: HTMLElement,
  range: Range,
): () => void {
  const browserWindow = window as Window & {
    Highlight?: new (...ranges: Range[]) => object;
  };
  const highlightStore = (window.CSS as unknown as {
    highlights?: { set: (name: string, value: object) => void; delete: (name: string) => void };
  }).highlights;
  if (browserWindow.Highlight && highlightStore) {
    highlightStore.set('reader-note', new browserWindow.Highlight(range));
    return () => {
      highlightStore.delete('reader-note');
    };
  }
  paragraph.classList.add('reader-note-highlight');
  return () => paragraph.classList.remove('reader-note-highlight');
}

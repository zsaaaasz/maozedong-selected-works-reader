import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ARTICLES } from '@/data/manifest';
import { VOLUMES } from '@/data/volumes';
import { getAllReadingProgress, READING_PROGRESS_EVENT } from '@/lib/storage';
import type { ReadingProgress } from '@/types';

export function Shelf() {
  const [progress, setProgress] = useState<ReadingProgress[]>([]);

  useEffect(() => {
    let active = true;
    const load = () => {
      void getAllReadingProgress().then((items) => {
        if (active) setProgress(items);
      });
    };
    load();
    // 阅读页退出时的进度是异步落库的，挂载那一下常读到旧值，写完后再拉一次。
    window.addEventListener(READING_PROGRESS_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(READING_PROGRESS_EVENT, load);
    };
  }, []);

  const progressByArticle = useMemo(
    () => new Map(progress.map((item) => [item.articleId, item])),
    [progress],
  );
  const lastProgress = useMemo(() => {
    const list = progress.filter((item) => Number.isFinite(item.scrollFraction));
    const sorted = list.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    // 优先“真的读过一点”的那篇；只是点开浏览过、位置还在开头的记录不参与竞争。
    return sorted.find((item) => item.scrollFraction > 0.005) ?? sorted[0];
  }, [progress]);
  const lastArticle = ARTICLES.find((article) => article.id === lastProgress?.articleId);
  const resumeArticle = lastArticle ?? ARTICLES[0];
  const hasResume = Boolean(lastArticle && lastProgress);

  return (
    <div className="mx-auto max-w-reader px-5 pb-8 sm:px-8">
      <header className="relative isolate -mx-5 mb-3 bg-paper text-ink dark:bg-dark-paper dark:text-[#F2E7D6] sm:-mx-8 sm:mb-6">
        {/* 整幅顶部图：版画肖像 + 朱红层叠山峦，按原比例铺满整行宽度 */}
        <div className="relative overflow-hidden bg-[#0A0807] pt-[calc(max(env(safe-area-inset-top),24px)_+_8px)] sm:pt-0">
          <img
            src="/assets/hero-banner.webp"
            alt="毛主席木刻版画像与朱红层叠山峦"
            draggable={false}
            className="pointer-events-none block h-auto w-full select-none object-fill"
          />
          {/* 顶缘收一道暗色，状态栏字母不落在亮处 */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[calc(max(env(safe-area-inset-top),24px)_+_24px)] bg-[linear-gradient(to_bottom,rgba(10,8,7,1)_0%,rgba(10,8,7,1)_68%,rgba(10,8,7,0)_100%)]"
            aria-hidden
          />
          {/* 底缘溶进页面底色（浅色纸） */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-[linear-gradient(to_top,#F5EEE5_0%,rgba(245,238,229,.94)_14%,rgba(245,238,229,.72)_34%,rgba(245,238,229,.4)_56%,rgba(245,238,229,.14)_78%,rgba(245,238,229,0)_100%)] dark:hidden"
            aria-hidden
          />
          {/* 底缘溶进页面底色（深色近黑） */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[20%] bg-[linear-gradient(to_top,#0D0A09_0%,rgba(13,10,9,.92)_22%,rgba(13,10,9,.66)_44%,rgba(13,10,9,.34)_66%,rgba(13,10,9,.1)_85%,rgba(13,10,9,0)_100%)] dark:block"
            aria-hidden
          />
          {/* 标题压在肖像右侧的暗部，跟随图幅高度定位，任何宽度都在同一条视觉线上 */}
          <div className="pointer-events-none absolute left-[38%] right-0 top-[calc(max(env(safe-area-inset-top),24px)_+_46px)] z-10 flex flex-col items-center text-center sm:left-[40%] sm:right-8 sm:top-[32%]">
            <h1 className="font-serif-cn text-[2.3rem] font-semibold leading-[1.14] tracking-[0.02em] text-[#F2E7D6] [text-shadow:0_2px_16px_rgba(8,4,3,.9)] min-[380px]:text-[2.5rem] sm:text-[2.8rem] sm:tracking-[0.04em]">
              毛泽东选集
            </h1>
            <div className="brush-underline mt-2.5 w-[100px] min-[380px]:w-[112px] sm:w-[132px]" aria-hidden />
          </div>
        </div>
      </header>

      {resumeArticle && (
        <Link
          to={'/read/' + resumeArticle.id}
          className="group mb-5 flex min-h-[108px] items-center gap-3 rounded-[18px] border border-ink/10 bg-gradient-to-br from-[#FCF7EE] to-[#F4EBDC] px-3.5 py-3 text-ink transition-transform active:scale-[0.99] dark:border-[#3A2B26] dark:from-[#211816] dark:to-[#171110] dark:text-[#F2E7D6] sm:mb-9 sm:px-5 sm:py-4"
        >
          <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-cinnabar/45 text-cinnabar" aria-hidden>
            <BookIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif-cn text-[13px] tracking-[0.2em] text-[#C8544C]">
              {hasResume ? '续读' : '开始'}
            </span>
            <span className="mt-1.5 block truncate font-serif-cn text-[22px] font-semibold leading-snug tracking-[0.02em]">
              {hasResume ? resumeArticle.title : '从第一卷开始阅读'}
            </span>
            <span className="mt-1.5 block font-serif-cn text-[14px] leading-relaxed tracking-[0.03em] text-secondary dark:text-[#A99385]">
              {hasResume
                ? resumeArticle.volume?.replace('《毛泽东选集》', '') + '　·　已读 ' + Math.round((lastProgress?.scrollFraction ?? 0) * 100) + '%'
                : '读过的文章和位置会保存在这里'}
            </span>
            {hasResume && (
            <span className="mt-2 block h-[3px] overflow-hidden rounded-full bg-ink/12 dark:bg-[#33241F]">
                <span
                  className="block h-full rounded-full bg-cinnabar transition-[width] duration-500"
                  style={{ width: Math.max(3, (lastProgress?.scrollFraction ?? 0) * 100) + '%' }}
                />
              </span>
            )}
          </span>
          <span className="pr-0.5 font-serif-cn text-2xl leading-none text-cinnabar/80 transition-transform group-hover:translate-x-1" aria-hidden>›</span>
        </Link>
      )}

      <section aria-labelledby="volume-list-title" className="pb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="volume-list-title" className="flex items-center gap-2.5 font-serif-cn text-[20px] font-semibold tracking-[0.06em] text-ink dark:text-dark-ink">
            <span className="h-[26px] w-[3px] rounded-[2px] bg-cinnabar" aria-hidden />
            按卷阅读
          </h2>
          <span className="font-serif-cn text-[14px] tracking-[0.04em] text-secondary dark:text-dark-secondary">{ARTICLES.length} 篇</span>
        </div>

        <ol className="space-y-2">
          {VOLUMES.map((volume) => {
            const articles = ARTICLES.filter((article) => article.volume === volume.fullTitle);
            const completed = articles.filter(
              (article) => (progressByArticle.get(article.id)?.scrollFraction ?? 0) >= 0.99,
            ).length;
            const volumeProgress = articles.length
              ? articles.reduce((sum, article) => sum + (progressByArticle.get(article.id)?.scrollFraction ?? 0), 0) / articles.length
              : 0;

            return (
              <li key={volume.id}>
                <Link
                  to={'/volume/' + volume.id}
                  className="group flex min-h-[84px] items-center gap-3 rounded-[16px] border border-ink/10 bg-white/60 px-3 py-2 transition-[transform,border-color] active:scale-[0.99] dark:border-[#33241F] dark:bg-[#171110] sm:min-h-[100px] sm:gap-5 sm:px-4 sm:py-3"
                >
                  <span className="relative flex h-[64px] w-[78px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[#D9B98F] bg-[#EED6B2] text-[#7E2A24] shadow-[0_4px_10px_rgba(0,0,0,0.28)] sm:h-[74px] sm:w-[90px]">
                    <span className="absolute inset-y-0 left-0 w-2.5 bg-[#B02A2B] shadow-[2px_0_5px_rgba(60,18,15,0.35)]" />
                    <span className="ml-1.5 text-center font-serif-cn leading-tight">
                      <span className="block text-[12.5px] font-semibold tracking-[0.02em]">毛泽东选集</span>
                      <span className="mt-1.5 block text-[12px] text-[#8E4A3C]">{volume.label}</span>
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-serif-cn text-[21px] font-semibold tracking-[0.02em] text-ink dark:text-dark-ink">
                      {volume.label}
                    </span>
                    <span className="mt-1.5 block font-serif-cn text-[14px] tracking-[0.03em] text-secondary dark:text-dark-secondary">
                      {articles.length} 篇
                      {completed > 0 && <span>　已读完 {completed} 篇</span>}
                    </span>
                    {volumeProgress > 0.005 && (
                      <span className="mt-2.5 block h-[3px] overflow-hidden rounded-full bg-ink/10 dark:bg-[#33241F]">
                        <span
                          className="block h-full rounded-full bg-cinnabar/85"
                          style={{ width: (volumeProgress * 100) + '%' }}
                        />
                      </span>
                    )}
                  </span>
                  <span className="pr-0.5 font-serif-cn text-2xl leading-none text-cinnabar/70 transition-transform group-hover:translate-x-1" aria-hidden>›</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function BookIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 5.5c3.4-1.1 6.2-.5 8.5 1.5v13c-2.3-2-5.1-2.6-8.5-1.5v-13Z" />
      <path d="M20.5 5.5c-3.4-1.1-6.2-.5-8.5 1.5v13c2.3-2 5.1-2.6 8.5-1.5v-13Z" />
    </svg>
  );
}

import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header
      className="relative z-30 shrink-0 pt-[env(safe-area-inset-top)]
                 backdrop-blur-xl bg-paper/88 dark:bg-dark-paper/92
                 border-b border-ink/8 dark:border-dark-line"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-8 h-12 flex items-center">
        <Link
          to="/"
          className="group inline-flex min-h-[44px] items-center font-serif-cn text-[16px] font-medium
                     tracking-[0.14em] text-ink dark:text-dark-ink touch-manipulation"
          aria-label="毛泽东选集 · 返回目录"
        >
          <span>毛泽东选集</span>
        </Link>
      </div>
    </header>
  );
}

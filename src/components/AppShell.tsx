import { useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Header } from './Header';

type IconName = 'shelf' | 'ask' | 'shake' | 'notes' | 'person';

const TABS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: '书架', icon: 'shelf', end: true },
  { to: '/notes', label: '笔记', icon: 'notes' },
  { to: '/me', label: '我的', icon: 'person' },
];

export function AppShell() {
  const { pathname } = useLocation();
  const isReader = pathname.startsWith('/read/');
  const isShelf = pathname === '/';

  useEffect(() => {
    if (isReader) return;
    const pageNames: Record<string, string> = {
      '/': '书架',
      '/notes': '我的笔记',
      '/me': '我的',
      '/privacy': '隐私政策',
    };
    document.title = `${pageNames[pathname] ?? '书架'} · 毛泽东选集`;
  }, [isReader, pathname]);

  if (isReader) {
    return (
      <main id="main-content" className="h-dvh min-h-0 overflow-hidden">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="app-surface h-dvh min-h-0 flex flex-col overflow-hidden">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-card
                   bg-ink px-3 py-2 text-sm text-paper shadow-lg transition-transform
                   focus:translate-y-0 dark:bg-dark-ink dark:text-dark-paper"
      >
        跳到主要内容
      </a>
      {!isShelf && <Header />}
      <main
        id="main-content"
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-4"
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  return (
    <nav
      aria-label="主要导航"
      className="relative z-30 shrink-0 backdrop-blur-xl bg-paper/84 dark:bg-dark-paper/78
                 border-t border-ink/8 dark:border-dark-line shadow-[0_-8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.24)]
                 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-3xl mx-auto h-[3.75rem] grid grid-cols-3 px-1">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              [
                'relative flex flex-col items-center justify-center gap-1.5 rounded-card',
                'transition-colors duration-180 min-h-[48px] touch-manipulation',
                isActive
                  ? 'text-cinnabar'
                  : 'text-ink/50 dark:text-dark-ink/45 hover:text-ink dark:hover:text-dark-ink',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <NavIcon name={tab.icon} active={isActive} />
                <span className="font-serif-cn text-[14px] font-medium leading-none tracking-[0.08em]">
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function NavIcon({ name, active }: { name: IconName; active?: boolean }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: active ? 1.7 : 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'shelf') {
    return (
      <svg {...common}>
        <path d="M4.5 5.25A2.25 2.25 0 0 1 6.75 3H11v16H6.75A2.25 2.25 0 0 0 4.5 21V5.25Z" />
        <path d="M19.5 5.25A2.25 2.25 0 0 0 17.25 3H13v16h4.25a2.25 2.25 0 0 1 2.25 2V5.25Z" />
      </svg>
    );
  }
  if (name === 'ask') {
    return (
      <svg {...common}>
        {/* Chat bubble with a sprout/leaf — the "AI responds to you" vibe */}
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H10l-4 3.5V17H6.5A2.5 2.5 0 0 1 4 14.5v-8Z" />
        <path d="M9 9.5c0-.7.5-1.2 1.2-1.2" />
        <path d="M12 9.5c0-.7.5-1.2 1.2-1.2" />
        <path d="M9.5 12.4c.5.4 1.4.7 2.3.7s1.8-.3 2.3-.7" />
      </svg>
    );
  }
  if (name === 'notes') {
    return (
      <svg {...common}>
        <path d="M7 3.75h7.25L19 8.5v11.75A1.75 1.75 0 0 1 17.25 22H7A2.5 2.5 0 0 1 4.5 19.5v-13A2.75 2.75 0 0 1 7.25 3.75Z" />
        <path d="M14 4v5h5M8 12h7M8 15.5h7M8 19h4" />
      </svg>
    );
  }
  if (name === 'shake') {
    return (
      <svg {...common}>
        {/* Phone with motion waves — the "shake" affordance */}
        <rect x="9" y="3.5" width="6" height="13" rx="1.4" />
        <line x1="11" y1="5.8" x2="13" y2="5.8" />
        <circle cx="12" cy="14.4" r="0.55" fill="currentColor" stroke="none" />
        {/* Left waves */}
        <path d="M6 6.5 Q3.5 8 3.5 10" />
        <path d="M7.5 8.5 Q6 9.5 6 10" />
        {/* Right waves */}
        <path d="M18 6.5 Q20.5 8 20.5 10" />
        <path d="M16.5 8.5 Q18 9.5 18 10" />
        {/* Subtle motion arrows */}
        <path d="M2 18.5l1.2-1.2M3.2 18.5H1.5" />
        <path d="M22 18.5l-1.2-1.2M20.8 18.5h1.7" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.25 21a6.75 6.75 0 0 1 13.5 0" />
    </svg>
  );
}

import { useTheme } from '@/hooks/useTheme';

/**
 * Cycle: light → dark → system → light
 * Compact button for the header; shows the next-mode icon.
 */
export function ThemeToggle({ onDark = false }: { onDark?: boolean }) {
  const [mode, setMode] = useTheme();
  const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
  const label =
    mode === 'light'
      ? '浅色'
      : mode === 'dark'
      ? '深色'
      : '跟随系统';

  return (
    <button
      type="button"
      aria-label={`切换显示主题：${label}`}
      title={`切换显示主题：${label}`}
      onClick={() => setMode(next)}
      className={[
        'flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full transition-[background-color,transform,color] duration-180 active:scale-95',
        onDark
          ? 'border border-[#F2E7D6]/35 bg-[#F2E7D6]/[0.12] text-[#F2E7D6] shadow-[0_5px_18px_rgba(0,0,0,0.28)] backdrop-blur-xl hover:bg-[#F2E7D6]/[0.18]'
          : 'border border-ink/10 bg-white/65 px-3 py-1.5 text-sm text-ink shadow-[0_4px_14px_rgba(0,0,0,0.08)] hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-dark-ink dark:shadow-[0_4px_14px_rgba(0,0,0,0.22)] dark:hover:bg-white/10',
      ].join(' ')}
    >
      <span className="text-[13px] leading-none">{mode === 'light' ? '☀' : mode === 'dark' ? '☾' : '◐'}</span>
      {!onDark && <span className="ml-1.5 hidden text-[12px] sm:inline">{label}</span>}
    </button>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { applyTheme, readThemeMode, THEME_STORAGE_KEY, type ThemeMode } from '@/lib/theme';

export function useTheme(): [ThemeMode, (m: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(() => readThemeMode());

  // Apply immediately on mount so the initial render matches stored/system
  // preference (otherwise we'd flash the wrong theme on first paint).
  useEffect(() => {
    applyTheme(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  // React to system changes when in "system" mode
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const update = useCallback((m: ThemeMode) => setMode(m), []);
  return [mode, update];
}

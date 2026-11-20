import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'maobible.theme';
const READER_THEME_MIGRATION_KEY = 'maobible.reader-theme-v1';

/** 本应用固定使用深色主题，并覆盖旧版本保存的浅色偏好。 */
export function readThemeMode(): ThemeMode {
  localStorage.setItem(THEME_STORAGE_KEY, 'dark');
  localStorage.setItem(READER_THEME_MIGRATION_KEY, '1');
  return 'dark';
}

export function resolveIsDark(_mode: ThemeMode): boolean {
  return true;
}

/** 把主题写到 <html>，并同步状态栏 / 系统控件配色。 */
export function applyTheme(mode: ThemeMode): void {
  const isDark = resolveIsDark(mode);
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#0D0A09' : '#F5EEE5');
  const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (appleMeta) appleMeta.setAttribute('content', isDark ? 'black' : 'default');

  if (Capacitor.isNativePlatform()) {
    void StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => undefined);
    if (Capacitor.getPlatform() === 'android') {
      void StatusBar.setBackgroundColor({ color: isDark ? '#0D0A09' : '#F5EEE5' }).catch(() => undefined);
    }
  }
}

/**
 * 启动时立刻套用主题。阅读页没有主题按钮，若只靠 useTheme，
 * 深色外观必须在挂载前应用，避免浅色闪屏。
 */
export function initTheme(): ThemeMode {
  try {
    const mode = readThemeMode();
    applyTheme(mode);
    return mode;
  } catch {
    // localStorage 不可用时退回深色，至少别让整页起不来
    applyTheme('dark');
    return 'dark';
  }
}

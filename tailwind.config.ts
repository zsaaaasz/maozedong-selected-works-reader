import type { Config } from 'tailwindcss';

/**
 * MaoBible Design Tokens
 * Source: docs/product-plan.md §6 视觉方向
 *
 * - Paper / Ink / Secondary / Moss / Cinnabar / DarkPaper
 * - Body 17–18px, line-height ~1.8
 * - Rounded 12–18px
 * - Animations 180–260ms
 * - Light + dark mode
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: '#F5EEE5',
        ink: '#28211E',
        secondary: '#796E67',
        moss: '#40564A',
        cinnabar: '#BE2D2E',
        'cinnabar-deep': '#8E2223',
        'dark-paper': '#0D0A09',
        'dark-surface': '#1A1412',
        'dark-surface-2': '#221A16',
        'dark-ink': '#F2E7D6',
        'dark-secondary': '#B4A296',
        'dark-line': '#382B26',
      },
      fontFamily: {
        // 内置思源宋体子集（Noto Serif SC 子集，含 wght 200–900 可变轴），
        // 未命中的字符回退到系统字体。
        sans: ['"MaoSerif"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        serif: ['"MaoSerif"', '"Source Serif 4"', '"Source Han Serif SC"', 'Georgia', 'serif'],
        // Chinese titles use a modern 宋体
        'serif-cn': [
          '"MaoSerif"',
          '"Noto Serif CJK SC"',
          '"Source Han Serif SC"',
          '"Noto Serif SC"',
          'Songti SC',
          'STSong',
          'SimSun',
          'serif',
        ],
      },
      fontSize: {
        // Body default 17–18px
        body: ['17px', { lineHeight: '1.9' }],
        'body-lg': ['18.5px', { lineHeight: '2.05' }],
      },
      opacity: {
        // 默认刻度之外的项目里用到的值；不补这些，bg-paper/88 之类的类会被静默丢弃
        8: '0.08',
        12: '0.12',
        18: '0.18',
        22: '0.22',
        34: '0.34',
        45: '0.45',
        55: '0.55',
        62: '0.62',
        75: '0.75',
        85: '0.85',
        88: '0.88',
        92: '0.92',
        94: '0.94',
      },
      borderRadius: {
        card: '14px',
        'card-lg': '20px',
      },
      maxWidth: {
        reader: '680px', // optimal reading width
      },
      transitionDuration: {
        180: '180ms',
        220: '220ms',
        260: '260ms',
      },
    },
  },
  plugins: [],
};

export default config;

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { spawn } from 'node:child_process';

/**
 * Dev-only AI middleware: /api/ai/ask, /api/ai/explain, /api/ai/summarize, /api/ai/recommend
 * Runs `mmx text chat` server-side so the browser doesn't need direct access to the LLM.
 */
function aiMiddleware(): Plugin {
  return {
    name: 'maobible-ai-middleware',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        const body = await readBody(req);
        const { prompt, system } = JSON.parse(body) as { prompt: string; system: string };
        const text = await runMmx(prompt, system);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ text }));
      });
    },
  };
}

function readBody(req: any): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c: Buffer) => (data += c.toString('utf8')));
    req.on('end', () => resolve(data));
  });
}

function runMmx(prompt: string, system: string): Promise<string> {
  return new Promise((resolve) => {
    const proc = spawn(
      'mmx',
      [
        'text', 'chat',
        '--model', 'MiniMax-M2.7-highspeed',
        '--system', system,
        '--message', prompt,
        '--max-tokens', '1024',
        '--quiet',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => proc.kill(), 30_000);
    proc.stdout.on('data', (d: Buffer) => (stdout += d.toString('utf8')));
    proc.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')));
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && stdout.trim()) resolve(stdout.trim());
      else resolve(`抱歉, AI 暂时不可用 (mmx exit ${code}: ${stderr.slice(0, 100)})`);
    });
    proc.on('error', () => resolve('抱歉, AI 暂时不可用'));
  });
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    aiMiddleware(),
    VitePWA({
      registerType: 'autoUpdate',
      // No injected registration script: main.tsx only registers a service
      // worker for the web build. The packaged Android app must never cache
      // index.html, otherwise an update keeps loading asset names that the
      // new APK no longer contains (blank screen).
      injectRegister: null,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: '毛泽东选集',
        short_name: '毛泽东选集',
        description: '离线阅读《毛泽东选集》，记录进度、书签和文字笔记。',
        lang: 'zh-CN',
        theme_color: '#40564A',
        background_color: '#F3F4EF',
        display: 'standalone',
        orientation: 'portrait-primary',
        categories: ['books', 'education'],
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Article JSON content — cache-first so reads are instant offline
            urlPattern: ({ url }) => url.pathname.startsWith('/content/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'maobible-content',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    // minSdk 24 ships with a Chrome 51-era V8 which doesn't support every
    // es2020 feature; pin to es2019 to keep the JS bundle safely transpiled
    // for our WebView floor. The PWA targets evergreen browsers anyway,
    // but the AAB is served inside Android System WebView.
    target: 'es2019',
    sourcemap: false,
    // Roll up the 5 pages + 9 components into a single chunk today (was
    // a 424k index-*.js). After we ship react.lazy() in Reader / Ask,
    // this can drop to ~140k for the first paint.
    chunkSizeWarningLimit: 500,
  },
});

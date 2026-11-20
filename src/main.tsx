import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import App from './App';
import { initTheme } from './lib/theme';
import './index.css';

// 早于首次渲染套用主题，避免浅色闪一下。
initTheme();

/**
 * The packaged Android app must never run a service worker: a cached
 * index.html would keep pointing at asset filenames that no longer exist
 * after an upgrade, leaving the app on a blank screen. The web build still
 * registers one so it stays installable / offline-capable.
 */
async function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (Capacitor.isNativePlatform()) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
    } catch {
      // Nothing to clean up; the app can still boot from the APK assets.
    }
    return;
  }
  // Web build: register the generated workbox service worker directly so
  // no extra runtime dependency is needed.
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    // Offline install just isn't available on this browser.
  }
}

void setupServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// Keep the supplied full-bleed artwork visible through Android's system splash
// transition, then reveal the reader with one quiet fade.
const bootSplash = document.getElementById('boot-splash');
if (bootSplash) {
  window.setTimeout(() => bootSplash.classList.add('is-hidden'), 1800);
  window.setTimeout(() => bootSplash.remove(), 2040);
}

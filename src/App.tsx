import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';

// Route-level code splitting — was a single 424k index chunk. The Reader
// is the heaviest page (note editor, haptics, share, framer-motion) so it
// only loads when the user actually opens an article. Shelf / Ask / Shake / Me
// stay eager because they are reachable from the bottom nav on first
// paint.
const Shelf = lazy(() => import('./pages/Shelf').then((m) => ({ default: m.Shelf })));
const Notes = lazy(() => import('./pages/Notes').then((m) => ({ default: m.Notes })));
const VolumeContents = lazy(() => import('./pages/VolumeContents').then((m) => ({ default: m.VolumeContents })));
const Me = lazy(() => import('./pages/Me').then((m) => ({ default: m.Me })));
const Reader = lazy(() => import('./pages/Reader').then((m) => ({ default: m.Reader })));
const Privacy = lazy(() => import('./pages/Privacy').then((m) => ({ default: m.Privacy })));

function PageFallback() {
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 text-secondary text-sm">
      加载中…
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Shelf />} />
          <Route path="/volume/:volumeId" element={<VolumeContents />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/me" element={<Me />} />
          <Route path="/read/:id" element={<Reader />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<Shelf />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

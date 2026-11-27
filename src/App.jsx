import React, { useEffect, lazy, Suspense, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ReactLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';
import 'skullet/styles.css';
import { SkulletProvider } from 'skullet/react';
// Temporary hold on Venetian Blinds page transition while evaluating Barba.js
// import { RouteTransitionProvider } from './components/ui/VenetianBlindsPageTransition';
import { BarbaPageTransition } from './components/ui/BarbaPageTransition';
import SystemDesignNavbar from './components/layout/SystemDesignNavbar';
import BlurFadeThemeTransition from './components/ui/BlurFadeThemeTransition';
import { useSimulationStore } from './store/simulationStore';
import MainPlatformPage from './pages/MainPlatformPage';
import MainLayout from './components/layout/MainLayout';
import VisualizerPage from './pages/VisualizerPage';
import ServersPage from './pages/ServersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AlgorithmsPage from './pages/AlgorithmsPage';
import LogsPage from './pages/LogsPage';
import SettingsPage from './pages/SettingsPage';
import { simulationEngine } from './simulation/engine';
import { initSoundSystem } from './lib/sound';
import { CustomScrollbar } from './components/ui/CustomScrollbar';

const loadMonitoringDashboardPage = () => import('./pages/MonitoringDashboardPage');
const loadAboutPage = () => import('./pages/AboutPage');

const MonitoringDashboardPage = lazy(loadMonitoringDashboardPage);
const AboutPage = lazy(loadAboutPage);

const LEGACY_LAYOUT_PREFIXES = [
  '/visualizer',
  '/servers',
  '/analytics',
  '/algorithms',
  '/logs',
  '/settings',
];

function RouteChunkFallback() {
  return (
    <div className="flex-1 w-full bg-[#FAF7F0] dark:bg-[#121212]" aria-busy="true" />
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const showPersistentNavbar = !LEGACY_LAYOUT_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix)
  );

  const preloadRoute = useCallback((pathname) => {
    if (pathname === '/monitoring') return loadMonitoringDashboardPage();
    if (pathname === '/about') return loadAboutPage();
    return Promise.resolve();
  }, []);

  return (
    /* Temporary hold on Venetian Blinds transition while testing Barba.js
    <RouteTransitionProvider
      navigate={navigate}
      columns={20}
      duration={0.5}
      staggerDelay={0.02}
      staggerType="center-out"
      origin="bottom"
    >
      ...
    </RouteTransitionProvider>
    */
    <BarbaPageTransition
      navigate={navigate}
      preloadRoute={preloadRoute}
      header={showPersistentNavbar ? <SystemDesignNavbar /> : null}
    >
      <Suspense fallback={<RouteChunkFallback />}>
        <Routes>
          <Route path="/" element={<MainPlatformPage />} />
          <Route path="/monitoring" element={<MonitoringDashboardPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route element={<MainLayout />}>
            <Route path="/visualizer" element={<VisualizerPage />} />
            <Route path="/servers" element={<ServersPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/algorithms" element={<AlgorithmsPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BarbaPageTransition>
  );
}

export default function App() {
  const isDarkMode = useSimulationStore((state) => state.isDarkMode);
  const setDarkMode = useSimulationStore((state) => state.setDarkMode);

  useEffect(() => {
    simulationEngine.start();
    const cleanupSound = initSoundSystem();
    return () => {
      cleanupSound();
      simulationEngine.stop();
    };
  }, []);

  useEffect(() => {
    const link = document.getElementById('bifrost-favicon');
    if (link) {
      link.setAttribute('href', isDarkMode ? '/logos/bifrost-white.png' : '/logos/bifrost-black.png');
    }
  }, [isDarkMode]);

  return (
    <ReactLenis root options={{ lerp: 0.1, smoothWheel: true }}>
      <BlurFadeThemeTransition
        duration={500}
        maxBlur={16}
        theme={isDarkMode ? 'dark' : 'light'}
        onThemeChange={(nextTheme) => setDarkMode(nextTheme === 'dark')}
      >
        <SkulletProvider
          mode={isDarkMode ? 'dark' : 'light'}
          reveal="sweep"
          theme={{
            light: {
              base: 'rgb(0 0 0 / 0.065)',
              highlight: 'rgb(255 255 255 / 0.72)',
            },
            dark: {
              base: 'rgb(255 255 255 / 0.08)',
              highlight: 'rgb(255 255 255 / 0.14)',
            },
            animation: 'shimmer',
            speed: 'slow',
            radius: '8px',
          }}
        >
          <BrowserRouter>
            <AppRoutes />
            <CustomScrollbar />
          </BrowserRouter>
        </SkulletProvider>
      </BlurFadeThemeTransition>
    </ReactLenis>
  );
}

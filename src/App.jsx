import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ReactLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';
import 'skullet/styles.css';
import { SkulletProvider } from 'skullet/react';
import { RouteTransitionProvider } from './components/ui/VenetianBlindsPageTransition';
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

const MonitoringDashboardPage = lazy(() => import('./pages/MonitoringDashboardPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

function RouteChunkFallback() {
  return (
    <div className="min-h-screen w-full bg-[#FAF7F0] dark:bg-[#121212]" aria-busy="true" />
  );
}

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <RouteTransitionProvider
      navigate={navigate}
      columns={20}
      duration={0.5}
      staggerDelay={0.02}
      staggerType="center-out"
      origin="bottom"
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
    </RouteTransitionProvider>
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
          </BrowserRouter>
        </SkulletProvider>
      </BlurFadeThemeTransition>
    </ReactLenis>
  );
}

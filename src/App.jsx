import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainPlatformPage from './pages/MainPlatformPage';
import MonitoringDashboardPage from './pages/MonitoringDashboardPage';
import MainLayout from './components/layout/MainLayout';
import VisualizerPage from './pages/VisualizerPage';
import ServersPage from './pages/ServersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AlgorithmsPage from './pages/AlgorithmsPage';
import LogsPage from './pages/LogsPage';
import SettingsPage from './pages/SettingsPage';
import { simulationEngine } from './simulation/engine';

export default function App() {
  useEffect(() => {
    simulationEngine.start();
    return () => {
      simulationEngine.stop();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPlatformPage />} />
        <Route path="/monitoring" element={<MonitoringDashboardPage />} />
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
    </BrowserRouter>
  );
}

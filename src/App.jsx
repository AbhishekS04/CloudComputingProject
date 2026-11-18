import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainPlatformPage from './pages/MainPlatformPage';
import { simulationEngine } from './simulation/engine';

export default function App() {
  // Start simulation on app boot
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

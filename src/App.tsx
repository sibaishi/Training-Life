import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useAppState } from './contexts/AppContext';
import { useTheme } from './hooks/useTheme';
import Layout from './components/Layout/Layout';
import Home from './pages/Home/Home';
import Plan from './pages/Plan/Plan';
import Checkin from './pages/Checkin/Checkin';
import Grocery from './pages/Grocery/Grocery';
import Settings from './pages/Settings/Settings';
import Trend from './pages/Trend/Trend';
import './styles/global.css';

function AppInner() {
  const { state } = useAppState();
  useTheme(state.theme);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plan/*" element={<Plan />} />
          <Route path="/checkin/*" element={<Checkin />} />
          <Route path="/grocery" element={<Grocery />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/trend" element={<Trend />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Search, Filter, Settings, Home, Youtube, Sun, Moon
} from 'lucide-react';
import axios from 'axios';

import BrandLogo from './components/BrandLogo';
import Modal from './components/Modal';
import { useAppData } from './hooks/useAppData';
import { API_BASE } from './config';

import LandingPage from './views/LandingPage';
import DashboardView from './views/DashboardView';
import YouTubeSection from './views/YouTubeSection';
import ScoutBotView from './views/ScoutBotView';
import HistoryView from './views/HistoryView';
import SettingsView from './views/SettingsView';

const NAV_ITEMS = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'insights', label: 'Dashboard', icon: BarChart3 },
  { id: 'youtube', label: 'Sentimining', icon: Youtube },
  { id: 'scout', label: 'Scout Bot', icon: Search },
  { id: 'history', label: 'Historial', icon: Filter },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export default function App() {
  // ─── Navigation & UI ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('home');
  const [theme, setTheme] = useState('dark');
  const [modal, setModal] = useState(null);

  // ─── History filter state ─────────────────────────────────────────────────
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');

  // ─── Scout Bot state ───────────────────────────────────────────────────────
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState([]);
  const [insights, setInsights] = useState(null);
  const [scoutError, setScoutError] = useState(null);
  const pollRef = useRef(null);
  const timeoutRef = useRef(null);

  // ─── Remote data via custom hook ──────────────────────────────────────────
  const { history, alerts, historicalData, brandsStatus, report, isUsingMockData } =
    useAppData(activeTab, selectedBrand, selectedPlatform);

  // ─── Theme toggle ─────────────────────────────────────────────────────────
  useEffect(() => {
    const root = window.document.documentElement;
    theme === 'light' ? root.classList.add('light') : root.classList.remove('light');
  }, [theme]);

  // ─── Cleanup polling on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // ─── Modal helpers ────────────────────────────────────────────────────────
  const showConfirm = (title, message, onConfirm) => setModal({ title, message, onConfirm, type: 'confirm' });
  const showAlert = (title, message) => setModal({ title, message, type: 'alert' });
  const closeModal = () => setModal(null);

  // ─── Scout Bot: scrape + poll ─────────────────────────────────────────────
  const handleScout = async () => {
    if (!url) return;
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setIsScraping(true);
    setScrapedData([]);
    setInsights(null);
    setScoutError(null);

    try {
      const res = await axios.post(`${API_BASE}/api/scout`, { url, platform });
      const { datasetId } = res.data;

      pollRef.current = setInterval(async () => {
        try {
          const resultsRes = await axios.get(`${API_BASE}/api/insights/${datasetId}`);
          if (resultsRes.data.comments > 0) {
            setScrapedData(resultsRes.data.comments_raw || []);
            setInsights(resultsRes.data);
            setIsScraping(false);
            clearInterval(pollRef.current);
            clearTimeout(timeoutRef.current);
          }
        } catch (e) {
          console.error('[Polling] Error:', e);
        }
      }, 5000);

      timeoutRef.current = setTimeout(() => {
        clearInterval(pollRef.current);
        setIsScraping(prev => {
          if (prev) setScoutError('Tiempo de espera agotado. El scraper tardó más de 2 minutos.');
          return false;
        });
      }, 120000);
    } catch (err) {
      setScoutError(err.message);
      setIsScraping(false);
    }
  };

  return (
    <div className="min-h-screen relative p-6 md:p-12 text-fg overflow-x-hidden">
      <div className="pwa-mesh">
        <div className="mesh-orb-1 opacity-20" />
        <div className="mesh-orb-2 opacity-10" />
      </div>

      {/* Banner Modo Demo — protege al management de ver datos sintéticos sin aviso */}
      {isUsingMockData && activeTab !== 'home' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2.5 bg-accent-orange/90 backdrop-blur-md border border-accent-orange text-black rounded-full shadow-2xl shadow-accent-orange/30 animate-pulse">
          <div className="w-2 h-2 bg-black/40 rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-widest">Modo Demo — Conectá el backend para datos reales</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sidebar */}
        <aside className="lg:col-span-3 flex flex-col min-h-[calc(100vh-6rem)] sticky top-12">
          <BrandLogo onNavigate={setActiveTab} />

          <nav className="space-y-2">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black italic uppercase text-xs tracking-widest ${
                  activeTab === item.id
                    ? 'bg-accent-orange text-white shadow-lg shadow-accent-orange/20 scale-[1.02]'
                    : 'text-fg/40 hover:bg-fg/5 hover:text-fg'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto flex justify-center pb-8">
            <button
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-fg/[0.03] border border-fg/10 text-fg hover:bg-fg/[0.08] transition-all hover:scale-[1.05] active:scale-95 group relative overflow-hidden shadow-lg shadow-black/5"
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              <div className="absolute inset-0 bg-accent-orange/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <motion.div
                key={theme}
                initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                {theme === 'dark'
                  ? <Moon size={20} className="text-accent-orange" />
                  : <Sun size={20} className="text-accent-orange" />
                }
              </motion.div>
            </button>
          </div>
        </aside>

        {/* Main content area */}
        <main className="lg:col-span-9 space-y-12">
          {activeTab === 'home' && (
            <LandingPage onEnter={() => setActiveTab('insights')} />
          )}
          {activeTab === 'insights' && (
            <DashboardView history={history} alerts={alerts} report={report} />
          )}
          {activeTab === 'youtube' && (
            <YouTubeSection />
          )}
          {activeTab === 'scout' && (
            <ScoutBotView
              platform={platform}
              setPlatform={setPlatform}
              url={url}
              setUrl={setUrl}
              handleScout={handleScout}
              isScraping={isScraping}
              insights={insights}
              scrapedData={scrapedData}
              error={scoutError}
            />
          )}
          {activeTab === 'history' && (
            <HistoryView
              selectedBrand={selectedBrand}
              setSelectedBrand={setSelectedBrand}
              selectedPlatform={selectedPlatform}
              setSelectedPlatform={setSelectedPlatform}
              historicalData={historicalData}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsView
              brandsStatus={brandsStatus}
              showConfirm={showConfirm}
              showAlert={showAlert}
            />
          )}
        </main>
      </div>

      <Modal modal={modal} closeModal={closeModal} />
    </div>
  );
}

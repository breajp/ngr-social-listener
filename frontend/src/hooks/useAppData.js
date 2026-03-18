import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

/**
 * Hook que centraliza todo el data fetching del dashboard.
 * Se re-ejecuta cuando cambia la tab activa, la marca o la plataforma seleccionada.
 */
export function useAppData(activeTab, selectedBrand, selectedPlatform) {
  const [history, setHistory] = useState([]);
  const [cuanticoInsights, setCuanticoInsights] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [brandsStatus, setBrandsStatus] = useState({});
  const [report, setReport] = useState(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  useEffect(() => {
    if (activeTab === 'home') return;

    const fetchAll = async () => {
      let usingMock = false;
      try {
        const [cuanticoRes, historyRes, alertsRes, historicalRes, reportRes, statusRes] = await Promise.all([
          axios.get(`${API_BASE}/api/cuantico/summary`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/api/history`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/api/alerts`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/api/historical`, { params: { brand: selectedBrand, platform: selectedPlatform } }).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/api/reports`).catch(() => ({ data: null })),
          axios.get(`${API_BASE}/api/admin/brands-status`).catch(() => ({ data: {} })),
        ]);

        setCuanticoInsights(cuanticoRes.data || []);
        setBrandsStatus(statusRes.data || {});

        // Historial: sin fallback falso — vacío es honesto
        const backHistory = historyRes.data || [];
        if (backHistory.length === 0) usingMock = true;
        setHistory(backHistory);

        setAlerts(alertsRes.data || []);

        // Comentarios: sin mock — tabla vacía es preferible a datos inventados
        const backData = historicalRes.data || [];
        if (backData.length === 0) usingMock = true;
        setHistoricalData(backData);

        // Reporte: si no hay real, usamos demo MARCADO como tal
        if (reportRes.data) {
          setReport(reportRes.data);
        } else {
          usingMock = true;
          setReport({
            _isDemo: true,
            executiveBrief: "Semana marcada por alta performance en Bembos gracias a la campaña 'Carretillera'. Se observa una correlación directa entre el engagement en TikTok y el flujo en locales.",
            brandPerformance: [
              { brand: 'Bembos', status: 'Growing', keyFinding: 'Aceptación masiva del nuevo spot en TikTok (+45% Menc).' },
              { brand: 'Papa Johns', status: 'Stable', keyFinding: 'Mantiene volumen estable en Instagram.' },
              { brand: 'Dunkin', status: 'Stable', keyFinding: 'Mantiene volumen con promociones de tarde.' },
              { brand: 'Popeyes', status: 'Stable', keyFinding: 'Interés constante en combos familiares.' },
            ],
            topStrategicRisk: 'Posible saturación de promociones en canal digital.',
            nextSteps: ['Optimizar pauta en TikTok', 'Reforzar stock de salsas en zona sur'],
          });
        }

        setIsUsingMockData(usingMock);
      } catch (e) {
        console.error('[useAppData] Error fetching data:', e);
        setIsUsingMockData(true);
      }
    };

    fetchAll();
  }, [activeTab, selectedBrand, selectedPlatform]);

  return { history, cuanticoInsights, alerts, historicalData, brandsStatus, report, isUsingMockData };
}

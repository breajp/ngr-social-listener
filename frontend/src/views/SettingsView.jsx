import axios from 'axios';
import { Settings, BarChart3, Search } from 'lucide-react';
import { API_BASE } from '../config';

const SettingsView = ({ brandsStatus, showConfirm, showAlert }) => (
  <section className="space-y-12 pb-20">
    <h1 className="pwa-title text-fg leading-tight">Panel de <br /><span className="text-fg/40">Configuración</span></h1>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Sentiment Alerts */}
      <div className="pwa-card p-8 bg-fg/[0.02] border-fg/5 space-y-6">
        <div className="flex items-center gap-3 text-accent-orange">
          <Settings size={20} />
          <h3 className="text-xs font-black uppercase italic tracking-widest">Alertas de Sentimiento</h3>
        </div>
        <p className="text-xs text-fg/60 dark:text-fg/40 leading-relaxed font-medium italic">
          Define los umbrales críticos para disparar alertas automáticas al Directorio y Slack.
        </p>
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] uppercase font-black tracking-widest opacity-60 text-fg">
              <span>Umbral de Crisis</span>
              <span className="text-accent-pink">30% Negativo</span>
            </div>
            <div className="h-1.5 w-full bg-fg/5 rounded-full overflow-hidden">
              <div className="h-full bg-accent-pink w-[30%] shadow-[0_0_10px_rgba(255,83,186,0.3)]" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] uppercase font-black tracking-widest opacity-60 text-fg">
              <span>Salud de Marca (Mínimo)</span>
              <span className="text-accent-lemon">70% Positivo</span>
            </div>
            <div className="h-1.5 w-full bg-fg/5 rounded-full overflow-hidden">
              <div className="h-full bg-accent-lemon w-[70%] shadow-[0_0_10px_rgba(152,255,188,0.3)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence Matrix Table */}
      <div className="pwa-card p-8 bg-fg/[0.02] border-fg/5 space-y-6 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-accent-lemon">
            <BarChart3 size={20} />
            <h3 className="text-xs font-black uppercase italic tracking-widest">Matriz de Inteligencia Estratégica</h3>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => showConfirm(
                'Cold Start',
                'Esto generará datos sintéticos realistas para los últimos 7 días de Bembos TikTok. ¿Continuar?',
                async () => {
                  try {
                    const res = await axios.post(`${API_BASE}/api/admin/seed-history`);
                    showAlert('✅ Cold Start Completado', `Se insertaron ${res.data.inserted} días de historial. Total en store: ${res.data.total} registros.`);
                  } catch (e) {
                    showAlert('❌ Error', 'No se pudo conectar al servidor. Verificá que el backend esté corriendo.');
                  }
                }
              )}
              className="px-6 py-2 bg-fg/5 text-fg/60 border border-fg/10 text-[10px] font-black uppercase italic rounded-full hover:bg-fg/10 transition-all"
            >
              Cold Start: Poblar 7 Días
            </button>
            <button
              onClick={() => showConfirm(
                'Escaneo Masivo',
                'Esto iniciará el scraping real de TikTok e Instagram para las 7 marcas monitoreadas. El proceso toma ~5 minutos en segundo plano. ¿Iniciar?',
                async () => {
                  try {
                    await axios.post(`${API_BASE}/api/admin/scout-all`);
                    showAlert('🚀 Escaneo Iniciado', 'El scraping está corriendo en 2do plano. Los datos aparecerán en el Dashboard en ~5 minutos.');
                  } catch (e) {
                    showAlert('❌ Error', 'No se pudo iniciar el escaneo. Verificá el backend.');
                  }
                }
              )}
              className="px-6 py-2 bg-accent-lemon text-black font-black text-[10px] uppercase italic rounded-full hover:scale-105 transition-all shadow-[0_0_20px_rgba(152,255,188,0.2)]"
            >
              Ejecutar Escaneo Masivo
            </button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[400px] no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-bg z-10 shadow-sm">
              <tr className="border-b border-fg/5">
                <th className="py-4 text-[9px] font-black uppercase tracking-widest text-fg/50 dark:text-fg/20">Marca / Entidad</th>
                <th className="py-4 text-[9px] font-black uppercase tracking-widest text-fg/50 dark:text-fg/20">Plataforma</th>
                <th className="py-4 text-[9px] font-black uppercase tracking-widest text-fg/50 dark:text-fg/20">Handle / Perfil</th>
                <th className="py-4 text-[9px] font-black uppercase tracking-widest text-fg/50 dark:text-fg/20">Categoría</th>
                <th className="py-4 text-[9px] font-black uppercase tracking-widest text-fg/50 dark:text-fg/20 text-center">Último Scan</th>
                <th className="py-4 text-[9px] font-black uppercase tracking-widest text-fg/50 dark:text-fg/20 text-center">Historial</th>
                <th className="py-4 text-[9px] font-black uppercase tracking-widest text-fg/50 dark:text-fg/20 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fg/[0.02]">
              {[
                { brand: 'Bembos', platform: 'TikTok', handle: '@bembos.oficial', type: 'Owned' },
                { brand: 'Papa Johns', platform: 'TikTok', handle: '@papajohnsperu', type: 'Owned' },
                { brand: 'Popeyes', platform: 'TikTok', handle: '@popeyesperuoficial', type: 'Owned' },
                { brand: 'China Wok', platform: 'TikTok', handle: '@chinawokperu', type: 'Owned' },
                { brand: 'Dunkin Donuts', platform: 'Instagram', handle: '@dunkindonutsperu', type: 'Owned' },
                { brand: 'McDonalds', platform: 'TikTok', handle: '@mcdonaldsperu', type: 'Competitor' },
                { brand: 'Burger King', platform: 'TikTok', handle: '@burgerking_peru', type: 'Competitor' },
                { brand: 'KFC', platform: 'TikTok', handle: '@kfcperu', type: 'Competitor' },
              ].map((row, i) => {
                const statusData = brandsStatus[row.brand];
                const hasData = statusData && statusData.count > 0;
                const dateObj = hasData && statusData.lastUpdated ? new Date(statusData.lastUpdated) : null;
                const dateStr = dateObj ? dateObj.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Esperando Data';
                const count = hasData ? statusData.count : 0;
                return (
                  <tr key={i} className="group hover:bg-fg/[0.01] transition-colors border-b border-fg/[0.02]">
                    <td className="py-4 text-xs font-black uppercase italic text-fg">{row.brand}</td>
                    <td className="py-4"><span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-fg/5 border border-fg/10 rounded-md text-fg/60">{row.platform}</span></td>
                    <td className="py-4 text-[10px] font-medium text-accent-orange italic">{row.handle}</td>
                    <td className="py-4"><span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${row.type === 'Owned' ? 'bg-accent-lemon/10 text-accent-lemon' : 'bg-fg/5 text-fg/40'}`}>{row.type}</span></td>
                    <td className="py-4 text-center text-[9px] font-black uppercase italic tracking-widest opacity-40 text-fg">{dateStr}</td>
                    <td className="py-4 text-center text-[10px] font-black uppercase italic text-accent-lemon">{count > 0 ? `${count} Scans` : '0 Scans'}</td>
                    <td className="py-4 flex items-center justify-end gap-2">
                      <div className={`w-1 h-1 rounded-full ${hasData ? 'bg-accent-lemon animate-pulse' : 'bg-fg/20'}`} />
                      <span className="text-[9px] font-black uppercase tracking-tighter opacity-40 text-fg">{hasData ? 'Tracking' : 'Pending'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-fg/20 font-medium italic">Automatización: Scrapers operativos sincronizados cada 24hs vía Apify Cloud para NGR Portfolio y Competencia Directa.</p>
      </div>

      {/* Integration Status */}
      <div className="pwa-card p-8 bg-fg/[0.02] border-fg/5 space-y-6 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-fg/80">
            <Search size={20} />
            <h3 className="text-xs font-black uppercase italic tracking-widest text-fg">Integraciones de IA & Notificaciones</h3>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-lemon/10 rounded-lg">
              <div className="w-1.5 h-1.5 bg-accent-lemon rounded-full animate-pulse" />
              <span className="text-[9px] font-black uppercase text-accent-lemon tracking-widest">Gemini 2.0 Flash Active</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-orange/10 rounded-lg">
              <div className="w-1.5 h-1.5 bg-accent-orange rounded-full" />
              <span className="text-[9px] font-black uppercase text-accent-orange tracking-widest">Slack Webhook Connected</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-4 bg-fg/[0.03] rounded-2xl border border-fg/5 space-y-2 text-center">
            <p className="text-[10px] font-black text-fg/30 uppercase tracking-widest">Apify API Usage</p>
            <p className="text-xl font-black italic text-fg">14.2% <span className="text-[10px] font-normal opacity-30">quota rest.</span></p>
          </div>
          <div className="p-4 bg-fg/[0.03] rounded-2xl border border-fg/5 space-y-2 text-center">
            <p className="text-[10px] font-black text-fg/30 uppercase tracking-widest">Report Frequency</p>
            <p className="text-xl font-black italic uppercase text-fg">Semanal</p>
          </div>
          <div className="p-4 bg-fg/[0.03] rounded-2xl border border-fg/5 space-y-2 text-center">
            <p className="text-[10px] font-black text-fg/30 uppercase tracking-widest">System Version</p>
            <p className="text-xl font-black italic uppercase text-fg">v2.4.0 <span className="text-[10px] font-normal opacity-30">Latest</span></p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default SettingsView;

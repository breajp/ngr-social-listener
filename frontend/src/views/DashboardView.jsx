import MetricCard from '../components/MetricCard';
import ShareOfVoiceChart from '../components/ShareOfVoiceChart';
import CyberWordCloud from '../components/CyberWordCloud';
import { BarChart3, MessageSquare, Settings } from 'lucide-react';

const getWeekLabel = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return `Semana ${String(week).padStart(2, '0')} / ${now.getFullYear()}`;
};

const DashboardView = ({ history, alerts, report }) => {
  const getSOV = () => {
    if (!history || history.length < 2) return [
      { name: 'BEMBOS', count: 450, color: '#98FFBC' },
      { name: 'PAPA JOHNS', count: 280, color: '#FF53BA' },
      { name: 'DUNKIN', count: 180, color: '#ff7700' },
      { name: 'POPEYES', count: 120, color: '#0070f3' },
    ];
    const brands = {};
    history.forEach(h => {
      const bname = h.brand || h.summary?.brand || 'Unknown';
      if (!brands[bname]) brands[bname] = 0;
      brands[bname] += h.commentsCount || h.summary?.volume || 0;
    });
    const colors = ['#98FFBC', '#FF53BA', '#ff7700', '#0070f3', '#ccff00', '#ff0080'];
    return Object.entries(brands).map(([name, count], i) => ({
      name: name.toUpperCase(), count, color: colors[i % colors.length],
    })).sort((a, b) => b.count - a.count).slice(0, 4);
  };

  const getPulse = () => {
    if (!history || history.length < 2) return [
      { name: 'NGR Portfolio', score: 82 },
      { name: "McDonald's Peru", score: 65 },
      { name: 'Burger King', score: 58 },
      { name: 'KFC Peru', score: 71 },
    ];
    const brands = {};
    history.forEach(h => {
      const bname = h.brand || h.summary?.brand || 'Unknown';
      const score = h.sentiment?.positive ?? h.summary?.sentiment?.positive ?? 0;
      if (!brands[bname]) brands[bname] = { sum: 0, count: 0 };
      brands[bname].sum += score;
      brands[bname].count += 1;
    });
    const owned = ['Bembos', 'Papa Johns', 'Popeyes', 'China Wok', 'Dunkin'];
    const pulse = Object.entries(brands).map(([name, val]) => ({
      name, score: Math.round(val.sum / Math.max(1, val.count)), isOwned: owned.includes(name),
    }));
    const ngrItems = pulse.filter(p => p.isOwned);
    const ngrScore = ngrItems.length > 0 ? Math.round(ngrItems.reduce((acc, p) => acc + p.score, 0) / ngrItems.length) : 0;
    return [
      { name: 'NGR Portfolio', score: ngrScore || 82 },
      ...pulse.filter(p => !p.isOwned).sort((a, b) => b.score - a.score).slice(0, 3),
    ];
  };

  const totalComments = history.reduce((acc, h) => acc + (h.commentsCount || h.summary?.volume || 0), 0);
  const avgSentiment = history.length > 0
    ? Math.round(history.reduce((acc, h) => acc + (h.sentiment?.positive || h.summary?.sentiment?.positive || 0), 0) / history.length)
    : 0;

  return (
    <div className="space-y-12 pb-20">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Menciones" value={history.length > 3 ? `${(totalComments / 1000).toFixed(1)}k` : '1.2k'} change="12" icon={MessageSquare} />
        <MetricCard title="Sentiment Health" value={history.length > 3 ? `${avgSentiment}%` : '78%'} change="5" icon={BarChart3} />
        <MetricCard title="Riesgos Activos" value={alerts.length || '0'} change={alerts.length > 0 ? alerts.length : '0'} icon={Settings} />
      </section>

      {report && (
        <section className="pwa-card p-10 bg-gradient-to-br from-fg/[0.03] to-transparent border-fg/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-lemon/5 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-accent-lemon/10 transition-all duration-700" />
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="px-4 py-1.5 bg-accent-lemon text-black font-black text-[10px] uppercase italic rounded-full shadow-[0_0_20px_rgba(152,255,188,0.4)]">Executive Report</div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-fg">Strategic Management Briefing</h2>
                {report._isDemo && (
                  <span className="px-3 py-1 bg-accent-orange/20 border border-accent-orange/40 text-accent-orange text-[9px] font-black uppercase tracking-widest rounded-full">Demo</span>
                )}
              </div>
              <span className="text-[10px] font-black uppercase text-fg/20 tracking-widest">{getWeekLabel()}</span>
            </div>

            <p className="text-lg font-bold text-fg/90 italic leading-relaxed max-w-4xl">"{report.executiveBrief}"</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {report.brandPerformance?.map((bp, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-fg/30">{bp.brand}</p>
                  <p className={`font-black uppercase italic text-sm ${bp.status === 'Crisis' ? 'text-accent-pink' : 'text-accent-lemon'}`}>{bp.status}</p>
                  <p className="text-[11px] font-medium text-fg/60 leading-tight">{bp.keyFinding}</p>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-fg/5 flex flex-col md:flex-row gap-12">
              <div className="flex-1 space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent-pink">Top Strategic Risk</h4>
                <p className="text-xs font-bold text-fg/80">{report.topStrategicRisk}</p>
              </div>
              <div className="flex-1 space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent-lemon">Action Plan</h4>
                <div className="flex flex-wrap gap-2">
                  {report.nextSteps?.map((step, i) => (
                    <span key={i} className="text-[9px] font-black uppercase px-3 py-1 bg-fg/5 border border-fg/10 rounded-full">{step}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-4 space-y-6">
          <ShareOfVoiceChart data={getSOV()} />
        </section>

        <section className="lg:col-span-4 pwa-card p-8 bg-fg/[0.02] border-fg/5 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase italic tracking-widest text-fg/40">Competitive Pulse</h3>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-accent-lemon rounded-full animate-pulse" />
              <span className="text-[9px] font-black uppercase text-accent-lemon tracking-widest">Market Status</span>
            </div>
          </div>
          <div className="space-y-5 pt-2">
            {getPulse().map(c => (
              <div key={c.name} className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="opacity-40">{c.name}</span>
                  <span className={c.score > 70 ? 'text-accent-lemon' : 'opacity-40'}>{c.score} Sent. pts</span>
                </div>
                <div className="h-1 w-full bg-fg/5 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${c.score > 75 ? 'bg-accent-lemon shadow-[0_0_8px_rgba(152,255,188,0.4)]' : 'bg-fg/20'}`} style={{ width: `${c.score}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9px] font-medium text-fg/20 italic pt-2">Benchmarking estratégico basado en IA generativa (Gemini Flash).</p>
        </section>

        <section className="lg:col-span-4 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black italic uppercase tracking-widest text-fg/40">Ambassador Hub</h3>
            <span className="text-[9px] font-black uppercase text-accent-lemon">Top Reach Fans</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {[
              { user: '@foodie_lima', reach: '52k', brand: 'Bembos', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150' },
              { user: '@travel_peru', reach: '128k', brand: 'Popeyes', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150' },
              { user: '@lima_eats', reach: '25k', brand: 'Bembos', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150' },
            ].map((fan, i) => (
              <div key={i} className="pwa-card p-4 bg-fg/[0.02] border-fg/5 flex items-center gap-4 hover:bg-fg/[0.04] transition-all cursor-pointer">
                <img src={fan.avatar} className="w-10 h-10 rounded-xl object-cover border border-fg/10" alt={fan.user} />
                <div className="flex-1">
                  <p className="font-black italic uppercase text-[10px] text-fg">{fan.user}</p>
                  <p className="text-[8px] font-black uppercase text-fg/30 tracking-widest">{fan.brand}</p>
                </div>
                <span className="text-[9px] font-black text-accent-lemon uppercase">{fan.reach}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="w-full">
        <CyberWordCloud
          words={history[0]?.wordCloud || [
            { word: 'SABOR', weight: 95 }, { word: 'PRECIO', weight: 80 },
            { word: 'DEMORA', weight: 60 }, { word: 'DELIVERY', weight: 45 },
            { word: 'PROMOS', weight: 90 }, { word: 'FRIO', weight: 30 },
            { word: 'EXCELENTE', weight: 85 }, { word: 'RÁPIDO', weight: 70 },
            { word: 'MALA ATENCIÓN', weight: 50 }, { word: 'ME ENCANTA', weight: 100 },
            { word: 'CRUJIENTE', weight: 75 }, { word: 'CARO', weight: 40 },
            { word: 'APP', weight: 65 },
          ]}
        />
      </section>
    </div>
  );
};

export default DashboardView;

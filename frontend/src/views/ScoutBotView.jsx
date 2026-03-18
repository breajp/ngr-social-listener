import { motion } from 'framer-motion';
import SentimentPill from '../components/SentimentPill';

const ScoutBotView = ({ platform, setPlatform, url, setUrl, handleScout, isScraping, insights, scrapedData, error }) => (
  <section className="space-y-8 pb-20">
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <p className="text-xs font-bold text-fg/20 uppercase tracking-widest mb-2">Social Listening Agent</p>
        <h1 className="pwa-title text-fg leading-tight">Scout Bot <br /><span className="text-accent-orange">Extractor</span></h1>
      </div>
      <div className="flex flex-col flex-1 max-w-md gap-4">
        <div className="flex gap-2">
          {['tiktok', 'instagram', 'google-maps', 'facebook'].map(p => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${platform === p ? 'bg-accent-orange border-accent-orange text-white' : 'bg-fg/5 border-fg/10 text-fg/40'}`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="pwa-card bg-fg/5 border-fg/10 px-4 py-2 text-xs flex-1 outline-none focus:border-accent-orange text-fg"
            placeholder={`URL de ${platform}...`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button onClick={handleScout} disabled={isScraping} className="pwa-btn px-6 py-2 text-white">
            {isScraping ? 'Analizando...' : 'Escanear'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <span className="text-[9px] font-black uppercase text-fg/20 w-full mb-1">Empresas NGR (Quick Connect)</span>
          {(platform === 'tiktok' ? [
            { label: 'Bembos', url: 'https://www.tiktok.com/@bembos_peru' },
            { label: 'Papa Johns', url: 'https://www.tiktok.com/@papajohns_peru' },
          ] : platform === 'instagram' ? [
            { label: 'Popeyes', url: 'https://www.instagram.com/popeyesperu/' },
            { label: 'Dunkin', url: 'https://www.instagram.com/dunkin_peru/' },
          ] : platform === 'google-maps' ? [
            { label: 'Bembos Surco', url: 'https://www.google.com/maps/search/bembos+surco' },
          ] : []).map(link => (
            <button
              key={link.label}
              onClick={() => { setUrl(link.url); setPlatform(platform); }}
              className="px-3 py-1 bg-fg/5 border border-fg/10 rounded-full text-[8px] font-black uppercase tracking-widest text-fg/40 hover:text-accent-orange hover:border-accent-orange transition-all"
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </header>

    {error && (
      <div className="pwa-card p-4 border-accent-pink/50 bg-accent-pink/10 text-accent-pink text-[10px] font-black italic uppercase tracking-widest">
        ⚠ {error}
      </div>
    )}

    {insights && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-8 pwa-card p-8 bg-gradient-to-br from-accent-orange/10 to-transparent border-accent-orange/20 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-accent-orange text-white font-black text-[10px] uppercase italic rounded-full">AI Insight</div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter text-fg">Resumen Ejecutivo</h2>
            </div>
            <p className="text-lg font-bold text-fg/90 leading-relaxed italic">"{insights.summary}"</p>
            <div className="flex flex-row gap-3">
              <SentimentPill type="positive" count={`${insights.sentiment?.positive || 0}%`} />
              <SentimentPill type="negative" count={`${insights.sentiment?.negative || 0}%`} />
            </div>
          </div>
          {insights.topicClusters && (
            <div className="space-y-4 border-t border-fg/5 pt-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-fg/30">Topic Clusters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.topicClusters.map((cluster, i) => (
                  <div key={i} className="p-4 bg-fg/5 rounded-xl border border-fg/5 flex justify-between items-center group hover:bg-fg/10 transition-all">
                    <div>
                      <p className="text-sm font-bold italic tracking-tight text-fg">{cluster.label}</p>
                      <p className="text-[9px] font-medium uppercase text-fg/20">{cluster.count} menciones</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${cluster.sentiment === 'negative' ? 'bg-accent-pink shadow-[0_0_10px_rgba(255,83,186,0.5)]' : 'bg-accent-lemon'}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
        <div className="lg:col-span-4 pwa-card p-6 bg-accent-lemon/5 border-accent-lemon/10 space-y-4">
          <h3 className="font-black italic uppercase text-xs tracking-widest text-accent-lemon">AI Responder</h3>
          {insights.suggestedReplies?.map((r, i) => (
            <div key={i} className="p-3 bg-fg/5 rounded-lg text-xs space-y-2">
              <p className="opacity-40 italic">"{r.comment}"</p>
              <p className="font-bold">"{r.reply}"</p>
            </div>
          ))}
        </div>
      </div>
    )}

    {scrapedData.length > 0 && (
      <div className="grid gap-4 mt-8">
        <h3 className="text-xs font-black italic uppercase tracking-widest text-fg/40">Comentarios Extraídos</h3>
        {scrapedData.map((c, i) => (
          <div key={i} className="pwa-card p-4 flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-fg/10 shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-black uppercase text-accent-orange">@{c.author}</p>
                {c.followers > 1000 && <span className="px-2 py-0.5 bg-accent-lemon/20 text-accent-lemon text-[8px] font-black uppercase rounded">Influencer {(c.followers / 1000).toFixed(1)}k</span>}
              </div>
              <p className="text-sm font-bold text-fg/80">{c.text}</p>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
);

export default ScoutBotView;

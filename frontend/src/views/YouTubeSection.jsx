import { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

const YouTubeSection = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setResults(null);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/api/youtube/analyze`, { videoUrl });
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className="space-y-8 pb-20">
      <header className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-bold text-fg/20 uppercase tracking-widest mb-2">Google Sentimining Solution</p>
          <h1 className="pwa-title leading-tight text-fg">YouTube <br /><span className="text-accent-blue font-black tracking-tighter uppercase italic">NLP Analysis</span></h1>
        </div>
        <div className="flex gap-4 max-w-2xl mt-4">
          <input
            className="pwa-card bg-fg/5 border-fg/10 px-6 py-4 text-xs flex-1 outline-none focus:border-accent-blue transition-all text-fg"
            placeholder="https://www.youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !videoUrl}
            className="pwa-btn px-8 bg-accent-blue border-accent-blue/50 text-white hover:shadow-[0_0_30px_rgba(0,112,243,0.4)] disabled:opacity-50"
          >
            {isAnalyzing ? 'PROCESANDO...' : 'ANALIZAR'}
          </button>
        </div>
      </header>

      {error && (
        <div className="pwa-card p-4 border-accent-pink/50 bg-accent-pink/10 text-accent-pink text-[10px] font-black italic uppercase tracking-widest">
          ERROR DETECTADO: {error}
        </div>
      )}

      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="lg:col-span-8 pwa-card p-10 bg-gradient-to-br from-accent-blue/10 to-transparent border-accent-blue/20">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black italic uppercase tracking-tighter text-fg">Sentimining Insights</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent-lemon rounded-full shadow-[0_0_10px_#98FFBC]" />
                <span className="text-[10px] font-black uppercase text-accent-lemon tracking-widest">{results.summary}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.results.map((res, i) => (
                <div key={i} className="flex flex-col gap-2 p-4 bg-fg/[0.03] rounded-2xl border border-fg/5 group hover:bg-fg/[0.05] transition-all">
                  <p className="text-[11px] text-fg/50 italic leading-relaxed line-clamp-3">"{res.text}"</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex-1 h-1 bg-fg/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${res.score > 0.3 ? 'bg-accent-lemon' : res.score < -0.3 ? 'bg-accent-pink' : 'bg-fg/40'}`}
                        style={{ width: `${50 + (res.score * 50)}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-black uppercase text-fg/40 group-hover:text-fg transition-colors">{res.score.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="pwa-card p-8 bg-fg/[0.01] border-fg/5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-fg/30 mb-6 italic">GCP Flow Status</h4>
              <div className="space-y-6">
                {[
                  { step: '01', label: 'YouTube Captions', status: 'Processed', color: 'text-accent-lemon' },
                  { step: '02', label: 'NL API Sentiment', status: 'Active', color: 'text-accent-blue' },
                  { step: '03', label: 'Entity extraction', status: 'Enabled', color: 'text-accent-lemon' },
                  { step: '04', label: 'BigQuery Sync', status: 'Pending', color: 'text-fg/20' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-2xl font-black italic opacity-5">{s.step}</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-black uppercase tracking-tighter">{s.label}</p>
                      <p className={`text-[9px] font-bold uppercase ${s.color}`}>{s.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default YouTubeSection;

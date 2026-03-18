import CustomDropdown from '../components/CustomDropdown';

const HistoryView = ({ selectedBrand, setSelectedBrand, selectedPlatform, setSelectedPlatform, historicalData }) => (
  <section className="space-y-12 pb-20">
    <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
      <h1 className="pwa-title leading-tight text-fg">Historial de <br /><span className="text-fg/40">Comentarios</span></h1>
      <div className="flex flex-row gap-6">
        <CustomDropdown
          label="Restaurant"
          value={selectedBrand}
          onChange={setSelectedBrand}
          options={[
            { label: 'Todos los Restaurants', value: '' },
            { label: 'Bembos', value: 'Bembos' },
            { label: 'Papa Johns', value: 'Papa Johns' },
            { label: 'Dunkin', value: 'Dunkin' },
            { label: 'Popeyes', value: 'Popeyes' },
          ]}
        />
        <CustomDropdown
          label="Canal Social"
          value={selectedPlatform}
          onChange={setSelectedPlatform}
          options={[
            { label: 'Todas las Plataformas', value: '' },
            { label: 'TikTok', value: 'tiktok' },
            { label: 'Instagram', value: 'instagram' },
          ]}
        />
      </div>
    </header>

    <div className="pwa-card overflow-hidden border-fg/5 bg-fg/[0.02]">
      <table className="w-full text-left">
        <thead className="bg-fg/5 border-b border-fg/10">
          <tr>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-fg/30">Usuario</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-fg/30">Comentario</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-fg/30">Canal</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-fg/30">Marca</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-fg/30">Análisis</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-fg/5 text-sm">
          {historicalData.length === 0 ? (
            <tr>
              <td colSpan="5" className="px-8 py-20 text-center opacity-20 italic">
                No se encontraron registros. Ejecutá un escaneo o conectá el backend.
              </td>
            </tr>
          ) : (
            historicalData.map((scan) => (scan.raw_comments || []).map((c, i) => (
              <tr key={`${scan.timestamp}-${i}`} className="hover:bg-fg/5 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex flex-col">
                    <span className="font-bold text-accent-orange text-xs tracking-tight">@{c.author}</span>
                    <span className="text-[9px] font-black uppercase opacity-20 mt-0.5 text-fg">{(c.followers || 0)} followers</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <p className="text-xs font-medium text-fg/80 italic leading-snug max-w-sm">"{c.text}"</p>
                </td>
                <td className="px-8 py-5">
                  <span className="px-2 py-1 bg-fg/5 border border-fg/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-fg/40">{scan.platform}</span>
                </td>
                <td className="px-8 py-5 font-black italic uppercase text-[10px] tracking-widest text-fg/60">{scan.brand}</td>
                <td className="px-8 py-5">
                  <div className={`flex items-center gap-2 ${scan.sentiment?.negative > 30 ? 'text-accent-pink' : 'text-accent-lemon'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${scan.sentiment?.negative > 30 ? 'bg-accent-pink shadow-[0_0_8px_rgba(255,83,186,0.6)]' : 'bg-accent-lemon shadow-[0_0_8px_rgba(152,255,188,0.6)]'}`} />
                    <span className="text-[10px] font-black uppercase italic tracking-tighter">{scan.sentiment?.negative > 30 ? 'Crítico' : 'Saludable'}</span>
                  </div>
                </td>
              </tr>
            )))
          )}
        </tbody>
      </table>
    </div>
  </section>
);

export default HistoryView;

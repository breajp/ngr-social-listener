import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomDropdown = ({ label, options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="flex flex-col gap-2 relative min-w-[200px]">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-fg/20 ml-1">{label}</span>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between bg-fg/5 border border-fg/10 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-tight hover:bg-fg/10 transition-all outline-none focus:border-accent-orange/50"
      >
        <span className={value ? 'text-fg' : 'text-fg/40'}>{selectedOption.label}</span>
        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-0 right-0 mt-2 bg-bg border border-fg/10 rounded-2xl overflow-hidden z-20 shadow-2xl"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-fg/5 ${value === opt.value ? 'text-accent-orange bg-fg/5' : 'text-fg/60'}`}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomDropdown;

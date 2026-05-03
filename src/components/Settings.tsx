import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PM_LIST } from '../types';
import type { AppSettings } from '../types';

interface Props {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  onClose: () => void;
}

const DEFAULT_PATHS: Record<string, string> = {};
PM_LIST.forEach((pm) => { DEFAULT_PATHS[pm.key] = pm.cmd; });

export default function Settings({ settings, onSave, onClose }: Props) {
  const [paths, setPaths] = useState<Record<string, string>>({ ...DEFAULT_PATHS, ...settings.pmPaths });

  const handleSave = () => {
    const cleaned: Record<string, string> = {};
    for (const key of Object.keys(paths)) {
      if (paths[key].trim()) cleaned[key] = paths[key].trim();
    }
    onSave({ pmPaths: cleaned });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'rgba(22, 22, 28, 0.98)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center space-x-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <h2 className="text-base font-semibold text-white/90">设置</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/12 flex items-center justify-center transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* PM Paths */}
          <div>
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-3">包管理器路径</p>
            <div className="space-y-2.5">
              {PM_LIST.map((pm) => (
                <div key={pm.key} className="flex items-center space-x-3">
                  <span className="w-16 text-xs text-white/45 flex-shrink-0">{pm.name}</span>
                  <input
                    type="text"
                    value={paths[pm.key]}
                    onChange={(e) => setPaths((p) => ({ ...p, [pm.key]: e.target.value }))}
                    placeholder={pm.cmd}
                    className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-xs text-white/80 font-mono placeholder:text-white/15 outline-none focus:border-accent-blue/40 focus:bg-white/8 transition-all"
                    spellCheck={false}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex space-x-3 px-5 py-4 border-t border-white/6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-blue/80 text-white text-sm font-semibold shadow-lg shadow-accent-blue/15"
          >
            保存设置
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/50 text-sm font-medium hover:bg-white/8 hover:text-white/70 transition-all"
          >
            取消
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

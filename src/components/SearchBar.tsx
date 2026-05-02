import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  value: string;
  onChange: (value: string) => void;
  isSearching: boolean;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, isSearching, placeholder }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className="relative"
    >
      <div
        className={`flex items-center rounded-2xl glass-panel-heavy px-5 py-3.5 transition-all duration-300 ${
          value ? 'ring-1 ring-accent-blue/30 shadow-lg shadow-accent-blue/5' : ''
        }`}
      >
        {/* 搜索图标 */}
        <motion.div
          animate={isSearching ? { rotate: 360 } : { rotate: 0 }}
          transition={isSearching ? { repeat: Infinity, duration: 1.2, ease: 'linear' } : {}}
          className="mr-3"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={value ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </motion.div>

        {/* 输入框 */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '搜索...'}
          className="flex-1 bg-transparent text-white text-sm font-medium placeholder:text-white/20 outline-none border-none"
          autoFocus
          spellCheck={false}
        />

        {/* 清除按钮 */}
        {value && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => onChange('')}
            className="ml-2 w-6 h-6 rounded-full bg-white/10 hover:bg-white/18 flex items-center justify-center transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </motion.button>
        )}

      </div>

      {/* 活跃指示器 */}
      {isSearching && (
        <div className="absolute -bottom-1 left-0 right-0 flex justify-center">
          <motion.div
            layoutId="search-indicator"
            className="h-0.5 bg-gradient-to-r from-transparent via-accent-blue/60 to-transparent rounded-full"
            style={{ width: '60%' }}
          />
        </div>
      )}
    </motion.div>
  );
}

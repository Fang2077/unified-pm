import React from 'react';
import { motion } from 'framer-motion';
import { PM_LIST } from '../types';
import type { PMKey, PackageResult } from '../types';

interface Props {
  pmKey: PMKey;
  pkg: PackageResult;
  onSelect: () => void;
  onInstall: () => void;
}

const cardVariants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2 } },
  hover: {
    y: -2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.16)',
    transition: { duration: 0.2 },
  },
  tap: { scale: 0.985, transition: { duration: 0.1 } },
};

export default function PackageCard({ pmKey, pkg, onSelect, onInstall }: Props) {
  const pm = PM_LIST.find((p) => p.key === pmKey)!;

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover="hover"
      whileTap="tap"
      onClick={onSelect}
      className="flex items-center px-4 py-3 rounded-xl glass-panel cursor-pointer group"
    >
      {/* PM 图标 */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: `${pm.color}18` }}
      >
        {pm.icon}
      </div>

      {/* 包信息 */}
      <div className="ml-3 flex-1 min-w-0">
        <div className="flex items-baseline space-x-2">
          <span className="text-sm font-semibold text-white/90 truncate">{pkg.name}</span>
          {pkg.version && (
            <span className="text-[11px] font-mono text-white/30 flex-shrink-0">{pkg.version}</span>
          )}
        </div>
        <div className="flex items-center space-x-2 mt-0.5">
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${pm.color}20`, color: pm.color }}
          >
            {pm.name}
          </span>
          {pkg.description && (
            <span className="text-[11px] text-white/30 truncate">{pkg.description}</span>
          )}
        </div>
      </div>

      {/* 安装按钮 */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          onInstall();
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        className="ml-3 px-3.5 py-1.5 rounded-full bg-accent-blue/15 text-accent-blue text-xs font-semibold hover:bg-accent-blue/25 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
      >
        安装
      </motion.button>
    </motion.div>
  );
}

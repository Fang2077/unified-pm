import React from 'react';
import { motion } from 'framer-motion';
import { PM_LIST } from '../types';
import type { PMKey, PackageResult } from '../types';

interface Props {
  pmKey: PMKey;
  pkg: PackageResult;
  detail: any;
  isLoading: boolean;
  onClose: () => void;
  onInstall: () => void;
}

export default function PackageDetail({ pmKey, pkg, detail, isLoading, onClose, onInstall }: Props) {
  const pm = PM_LIST.find((p) => p.key === pmKey)!;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* 面板 */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto mx-4 mb-4 sm:mb-0 rounded-2xl glass-panel-heavy p-6"
      >
        {/* 头部 */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: `${pm.color}20` }}
            >
              {pm.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white/95">{detail?.name || pkg.name}</h2>
              <p className="text-xs text-white/40">{pm.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/12 flex items-center justify-center transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              className="w-6 h-6 rounded-full border-2 border-white/10 border-t-accent-blue"
            />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            {detail.version && (
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold text-white/30 uppercase tracking-wider w-20">版本</span>
                <span className="text-sm font-mono text-white/80 bg-white/5 px-2 py-0.5 rounded">{detail.version}</span>
              </div>
            )}

            {detail.description && (
              <div className="flex items-start space-x-3">
                <span className="text-xs font-semibold text-white/30 uppercase tracking-wider w-20 mt-0.5">描述</span>
                <p className="text-sm text-white/70 leading-relaxed">{detail.description}</p>
              </div>
            )}

            {detail.homepage && (
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold text-white/30 uppercase tracking-wider w-20">主页</span>
                <a
                  href={detail.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-accent-blue/80 hover:text-accent-blue truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {detail.homepage}
                </a>
              </div>
            )}

            {detail.license && (
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold text-white/30 uppercase tracking-wider w-20">许可证</span>
                <span className="text-sm text-white/60">{detail.license}</span>
              </div>
            )}

            {detail.dependencies && detail.dependencies.length > 0 && (
              <div className="flex items-start space-x-3">
                <span className="text-xs font-semibold text-white/30 uppercase tracking-wider w-20 mt-1">依赖</span>
                <div className="flex flex-wrap gap-1.5">
                  {detail.dependencies.slice(0, 20).map((dep: string) => (
                    <span
                      key={dep}
                      className="px-2 py-0.5 rounded-full text-[11px] text-white/50 bg-white/5"
                    >
                      {dep}
                    </span>
                  ))}
                  {detail.dependencies.length > 20 && (
                    <span className="text-[11px] text-white/30">+{detail.dependencies.length - 20} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-white/35 text-sm py-8">无法加载包详情</p>
        )}

        {/* 操作按钮 */}
        <div className="flex space-x-3 mt-6 pt-4 border-t border-white/6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={onInstall}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-blue/80 text-white text-sm font-semibold shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/30 transition-shadow"
          >
            安装
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/50 text-sm font-medium hover:bg-white/8 hover:text-white/70 transition-all"
          >
            关闭
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

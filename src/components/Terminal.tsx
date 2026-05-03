import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PM_LIST } from '../types';
import type { CmdState } from '../types';

interface Props {
  cmdState: CmdState;
  onKill: () => void;
  onHide: () => void;
  onDismiss: () => void;
}

export default function Terminal({ cmdState, onKill, onHide, onDismiss }: Props) {
  const logEndRef = useRef<HTMLDivElement>(null);
  const pm = cmdState.pmKey ? PM_LIST.find((p) => p.key === cmdState.pmKey) : null;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cmdState.logs]);

  const isRunning = cmdState.status === 'running';
  const isDone = cmdState.status === 'done';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.93 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-2xl max-h-[70vh] mx-4 mb-4 sm:mb-0 rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'rgba(22, 22, 28, 0.96)' }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1.5">
              {/* 红: 终止 */}
              <button
                onClick={isRunning ? onKill : onDismiss}
                title={isRunning ? '终止运行' : '关闭'}
                className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF3B30] transition-colors"
              />
              {/* 黄: 隐藏到侧边栏 */}
              {isRunning && (
                <button
                  onClick={onHide}
                  title="收纳到侧边栏"
                  className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FFCC02] transition-colors"
                />
              )}
              {/* 绿: 无操作 */}
              <div className="w-3 h-3 rounded-full bg-[#28CA41] opacity-40" />
            </div>
            <div className="flex items-center space-x-2">
              {pm && (
                <span
                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white/80 flex-shrink-0"
                  style={{ backgroundColor: `${pm.color}30` }}
                >
                  {pm.icon}
                </span>
              )}
              <span className="text-sm font-semibold text-white/80">
                {cmdState.action === 'install' ? '安装' : '卸载'}: {cmdState.packageName}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isRunning && (
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-accent-orange animate-pulse" />
                <span className="text-[11px] text-accent-orange/80 font-medium">运行中</span>
              </div>
            )}
            {isDone && (
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-accent-green" />
                <span className="text-[11px] text-accent-green/80 font-medium">完成</span>
              </div>
            )}
            {cmdState.status === 'error' && (
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-accent-pink" />
                <span className="text-[11px] text-accent-pink/80 font-medium">错误 (code: {cmdState.exitCode})</span>
              </div>
            )}
          </div>
        </div>

        {/* 日志区域 */}
        <div className="p-5 overflow-y-auto max-h-[50vh] font-mono text-[13px] leading-relaxed space-y-0.5">
          {cmdState.logs.map((log) => (
            <div key={log.id} className="flex">
              <span className="text-white/15 flex-shrink-0 mr-2 select-none">
                {new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
              </span>
              <span
                className={
                  log.stream === 'system'
                    ? 'text-accent-blue/70'
                    : log.stream === 'stderr'
                    ? 'text-accent-orange/70'
                    : 'text-white/60'
                }
              >
                {log.text}
              </span>
            </div>
          ))}

          {isRunning && (
            <div className="flex items-center space-x-2">
              <span className="text-accent-blue/60">▍</span>
              <span className="text-white/25 italic">运行中...</span>
            </div>
          )}

          <div ref={logEndRef} />
        </div>

        {/* 底部操作栏 */}
        {!isRunning && (
          <div className="px-5 py-3 border-t border-white/8 flex justify-end space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={onDismiss}
              className="px-5 py-2 rounded-lg bg-white/6 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              关闭终端
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

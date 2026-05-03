import React from 'react';
import { motion } from 'framer-motion';
import { PM_LIST } from '../types';
import type { PMKey, CmdState } from '../types';

interface Props {
  selectedPMs: Set<PMKey>;
  onTogglePM: (key: PMKey) => void;
  onOpenSettings: () => void;
  tasks: Map<string, CmdState>;
  activeTaskId: string | null;
  onShowTask: (taskId: string) => void;
  onDismissTask: (taskId: string) => void;
}

const sidebarVariants = {
  initial: { x: -40, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

const itemVariants = {
  initial: { opacity: 0, x: -12 },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.3 + i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
};

export default function Sidebar({ selectedPMs, onTogglePM, onOpenSettings, tasks, activeTaskId, onShowTask, onDismissTask }: Props) {
  const hiddenTasks = Array.from(tasks.values()).filter(
    (t) => t.status === 'running' && t.taskId !== activeTaskId
  );

  return (
    <motion.aside
      variants={sidebarVariants}
      initial="initial"
      animate="animate"
      className="w-[220px] h-full flex flex-col pt-12 px-4 pb-4"
    >
      {/* Logo */}
      <div className="flex items-center space-x-2.5 px-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#007AFF] to-[#0044B3] flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent-blue/20">
          <svg width="24" height="24" viewBox="140 170 750 510" fill="none">
            <rect x="200" y="280" width="280" height="280" rx="36" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.55)" strokeWidth="14"/>
            <rect x="340" y="220" width="280" height="280" rx="36" fill="rgba(255,255,255,0.35)" stroke="rgba(255,255,255,0.75)" strokeWidth="14"/>
            <rect x="480" y="340" width="280" height="280" rx="36" fill="rgba(255,255,255,0.60)" stroke="rgba(255,255,255,1)" strokeWidth="14"/>
            <g transform="translate(620, 520)">
              <line x1="0" y1="-44" x2="0" y2="44" stroke="white" strokeWidth="15" strokeLinecap="round"/>
              <polyline points="-26,-10 0,26 26,-10" fill="none" stroke="white" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white/90 tracking-tight">UnifiedPM</h1>
          <p className="text-[10px] text-white/30 font-medium">统一包管理</p>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="h-px bg-white/6 mx-3 mb-5" />

      {/* 后台任务收纳栏 */}
      {hiddenTasks.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-3 mb-2">
            运行中 · {hiddenTasks.length}
          </p>
          <div className="space-y-1">
            {hiddenTasks.map((task) => {
              const pm = PM_LIST.find((p) => p.key === task.pmKey);
              return (
                <motion.button
                  key={task.taskId}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onShowTask(task.taskId)}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm bg-white/4 hover:bg-white/8 transition-all group"
                >
                  <span
                    className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white/80 flex-shrink-0"
                    style={{ backgroundColor: pm ? `${pm.color}30` : 'rgba(255,255,255,0.1)' }}
                  >
                    {pm?.icon}
                  </span>
                  <span className="text-xs text-white/70 truncate flex-1 text-left">
                    {task.action === 'install' ? '安装' : '卸载'} {task.packageName}
                  </span>
                  <motion.div
                    className="w-2 h-2 rounded-full bg-accent-orange animate-pulse flex-shrink-0"
                    title="运行中"
                  />
                </motion.button>
              );
            })}
          </div>
          <div className="h-px bg-white/6 mx-3 mt-3" />
        </div>
      )}

      {/* 包管理器列表 */}
      <div className="flex-1 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-3 mb-2">
          包管理器
        </p>
        {PM_LIST.map((pm, i) => (
          <motion.button
            key={pm.key}
            custom={i}
            variants={itemVariants}
            initial="initial"
            animate="animate"
            whileHover={{ x: 3, transition: { duration: 0.12, ease: 'easeOut' } }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onTogglePM(pm.key)}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
              selectedPMs.has(pm.key)
                ? 'bg-white/8 text-white/90'
                : 'text-white/35 hover:text-white/60 hover:bg-white/4'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 transition-transform group-hover:scale-125"
              style={{
                backgroundColor: selectedPMs.has(pm.key) ? '#007AFF' : 'rgba(255,255,255,0.15)',
                boxShadow: selectedPMs.has(pm.key) ? '0 0 8px rgba(0,122,255,0.25)' : 'none',
              }}
            />
            <span className="text-[11px] font-mono text-white/30 flex-shrink-0 w-11">{pm.cmd}</span>
            <span className="font-medium truncate">{pm.name}</span>
          </motion.button>
        ))}
      </div>

      {/* 底部 */}
      <div className="mt-auto pt-4">
        <div className="h-px bg-white/6 mx-3 mb-4" />

        {/* 设置按钮 */}
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-white/35 hover:text-white/65 hover:bg-white/4 transition-all mb-2"
        >
          <span className="text-[11px] font-mono text-white/20 flex-shrink-0 w-11">cfg</span>
          <span className="font-medium">设置</span>
        </button>

        <p className="text-[10px] text-white/20 text-center px-3">
          macOS Package Manager Hub
        </p>
        <p className="text-[10px] text-white/15 text-center mt-1">
          v1.0.0
        </p>
      </div>
    </motion.aside>
  );
}

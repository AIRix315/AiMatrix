/**
 * ProgressOrb 状态球组件
 *
 * 功能：
 * - 显示任务队列数量和进度百分比
 * - SVG 圆环进度指示器（64x64px）
 * - 生成时播放脉动动画
 * - 固定在右下角
 * - 点击展开任务列表（H3.1 实现）
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskQueueSheet, type Task } from './TaskQueueSheet';
import './ProgressOrb.css';

interface ProgressOrbProps {
  queueCount: number;      // 队列中的任务数
  progress: number;         // 进度百分比 (0-100)
  isGenerating: boolean;    // 是否正在生成
  tasks?: Task[];           // 任务列表（可选）
  onCancelTask?: (taskId: string) => void;
  onRetryTask?: (taskId: string) => void;
  onPauseTask?: (taskId: string) => void;
  onResumeTask?: (taskId: string) => void;
  onClearCompleted?: () => void;
}

export const ProgressOrb: React.FC<ProgressOrbProps> = ({
  queueCount,
  progress,
  isGenerating,
  tasks = [],
  onCancelTask = () => {},
  onRetryTask = () => {},
  onPauseTask = () => {},
  onResumeTask = () => {},
  onClearCompleted = () => {},
}) => {
  const [circumference, setCircumference] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const radius = 28; // 圆环半径
  const strokeWidth = 4; // 圆环宽度

  useEffect(() => {
    // 计算圆周长
    const c = 2 * Math.PI * radius;
    setCircumference(c);
  }, [radius]);

  // 计算进度偏移
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // 如果没有任务，不显示状态球
  if (queueCount === 0 && tasks.length === 0) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          className={`progress-orb ${isGenerating ? 'generating' : ''}`}
          onClick={() => setSheetOpen(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          title={`${queueCount} 个任务 | ${progress.toFixed(0)}% 完成 - 点击查看详情`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
        >
          <svg width="64" height="64" viewBox="0 0 64 64" className="progress-svg">
            {/* 背景圆环 */}
            <circle
              cx="32"
              cy="32"
              r={radius}
              stroke="oklch(0.24 0 0)"
              strokeWidth={strokeWidth}
              fill="none"
            />

            {/* 进度圆环 */}
            <circle
              cx="32"
              cy="32"
              r={radius}
              stroke="oklch(0.85 0.22 160)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="progress-ring"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
              }}
            />

            {/* 脉动效果圆环（生成时） */}
            {isGenerating && (
              <circle
                cx="32"
                cy="32"
                r={radius}
                stroke="oklch(0.85 0.22 160)"
                strokeWidth={strokeWidth}
                fill="none"
                className="pulse-ring"
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: '50% 50%',
                }}
              />
            )}
          </svg>

          {/* 中心文字 */}
          <div className="orb-content">
            <div className="queue-count">{queueCount}</div>
            <div className="progress-text">{progress.toFixed(0)}%</div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 任务队列抽屉 */}
      <TaskQueueSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        tasks={tasks}
        onCancelTask={onCancelTask}
        onRetryTask={onRetryTask}
        onPauseTask={onPauseTask}
        onResumeTask={onResumeTask}
        onClearCompleted={onClearCompleted}
      />
    </>
  );
};

export default ProgressOrb;

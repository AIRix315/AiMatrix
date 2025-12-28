/**
 * ProgressOrb 状态球组件
 * H2.3重设计：半圆形状、潮汐注水动画、Y轴可拖动
 *
 * 功能：
 * - 半圆形状吸附右侧边缘
 * - 潮汐注水动画显示进度
 * - Y轴可拖动调整位置
 * - 点击打开右侧面板队列Tab
 */

import React, { useState } from 'react';
import Draggable from 'react-draggable';
import './ProgressOrb.css';

interface ProgressOrbProps {
  taskCount: number;
  progress: number; // 0-100
  isGenerating: boolean;
  onClickOrb: () => void;
}

export const ProgressOrb: React.FC<ProgressOrbProps> = ({
  taskCount,
  progress,
  isGenerating,
  onClickOrb
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // 如果没有任务，不显示状态球
  if (taskCount === 0) {
    return null;
  }

  return (
    <Draggable
      axis="y"
      bounds="parent"
      position={position}
      onStop={(e, data) => setPosition({ x: 0, y: data.y })}
    >
      <div
        className={`progress-orb ${isGenerating ? 'generating' : ''}`}
        onClick={onClickOrb}
        title={`${taskCount} 个任务 | ${progress.toFixed(0)}% 完成 - 点击查看详情`}
      >
        {/* 潮汐注水容器 */}
        <div className="water-container">
          <div
            className="water-fill"
            style={{ height: `${progress}%` }}
          >
            {/* 波浪动画 */}
            <div className="wave-animation" />
          </div>
        </div>

        {/* 任务数显示 */}
        <span className="task-count">{taskCount}</span>
      </div>
    </Draggable>
  );
};

export default ProgressOrb;

/**
 * QueueTab - 队列TAB
 * 显示真实的插件任务执行队列，支持滚动和任务操作
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../common';
import type { TaskLog } from '@/shared/types';

interface QueueTabProps {
  // 从GlobalRightPanel传入的props被移除，改为内部获取真实数据
}

const TaskStatusIcon: React.FC<{ status: TaskLog['status'] }> = ({ status }) => {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'running':
      return <Clock className="h-4 w-4 text-primary animate-pulse" />;
    default:
      return null;
  }
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}分${secs}秒`;
};

export const QueueTab: React.FC<QueueTabProps> = () => {
  const [tasks, setTasks] = useState<TaskLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'running' | 'success' | 'error'>('all');

  // 加载任务列表
  const loadTasks = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.listTaskLogs(filter);
      setTasks(result);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和定时刷新
  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 3000); // 每3秒刷新
    return () => clearInterval(interval);
  }, [filter]);

  // 任务分组统计
  const {
    runningTasks,
    completedTasks,
    failedTasks
  } = useMemo(() => ({
    runningTasks: tasks.filter((t) => t.status === 'running'),
    completedTasks: tasks.filter((t) => t.status === 'success'),
    failedTasks: tasks.filter((t) => t.status === 'error'),
  }), [tasks]);

  // 格式化时间显示
  const formatTaskTime = (startTime: string, endTime: string | null) => {
    const start = new Date(startTime);
    if (!endTime) {
      return `开始于 ${start.toLocaleTimeString()}`;
    }
    const end = new Date(endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    return `耗时 ${formatTime(duration)}`;
  };

  return (
    <div className="queue-tab">
      {/* 任务统计和刷新 */}
      <div className="task-summary">
        <div className="flex gap-2">
          <Badge variant="default">{runningTasks.length} 运行中</Badge>
          <Badge variant="outline" className="text-green-500">
            {completedTasks.length} 已完成
          </Badge>
          {failedTasks.length > 0 && (
            <Badge variant="destructive">{failedTasks.length} 失败</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadTasks}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* 过滤器 */}
      <div className="flex gap-2 mb-3">
        <Button
          variant={filter === 'all' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          全部
        </Button>
        <Button
          variant={filter === 'running' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setFilter('running')}
        >
          运行中
        </Button>
        <Button
          variant={filter === 'error' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setFilter('error')}
        >
          失败
        </Button>
      </div>

      {/* 任务列表（可滚动） */}
      <div className="task-list">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            暂无任务
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <motion.div
                key={task.taskId}
                className="task-item"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.2 }}
              >
                <div className="task-header">
                  <TaskStatusIcon status={task.status} />
                  <div className="flex flex-col flex-1">
                    <span className="task-name">{task.pluginId}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTaskTime(task.startTime, task.endTime)}
                    </span>
                  </div>
                </div>

                {task.error && (
                  <p className="task-error">{task.error}</p>
                )}

                {task.status === 'running' && (
                  <div className="task-progress">
                    <div className="progress-bar">
                      <motion.div
                        className="progress-fill"
                        style={{ width: '100%' }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

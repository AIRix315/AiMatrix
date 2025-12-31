/**
 * QueueTab - 队列TAB
 * 显示大量并发任务，支持滚动和任务操作
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, RotateCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../common';
import type { Task } from '../../common/TaskQueueSheet';

interface QueueTabProps {
  tasks: Task[];
  onCancelTask?: (taskId: string) => void;
  onRetryTask?: (taskId: string) => void;
  onClearCompleted?: () => void;
}

const TaskStatusIcon: React.FC<{ status: Task['status'] }> = ({ status }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'running':
      return <CheckCircle2 className="h-4 w-4 text-primary animate-pulse" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
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

export const QueueTab: React.FC<QueueTabProps> = ({
  tasks,
  onCancelTask,
  onRetryTask,
  onClearCompleted,
}) => {
  // 任务分组统计
  const {
    runningTasks,
    pendingTasks,
    completedTasks,
    failedTasks
  } = useMemo(() => ({
    runningTasks: tasks.filter((t) => t.status === 'running'),
    pendingTasks: tasks.filter((t) => t.status === 'pending'),
    completedTasks: tasks.filter((t) => t.status === 'completed'),
    failedTasks: tasks.filter((t) => t.status === 'failed'),
  }), [tasks]);

  return (
    <div className="queue-tab">
      {/* 任务统计 */}
      <div className="task-summary">
        <Badge variant="default">{runningTasks.length} 运行中</Badge>
        <Badge variant="secondary">{pendingTasks.length} 等待中</Badge>
        <Badge variant="outline" className="text-green-500">
          {completedTasks.length} 已完成
        </Badge>
        {failedTasks.length > 0 && (
          <Badge variant="destructive">{failedTasks.length} 失败</Badge>
        )}
      </div>

      {/* 清除已完成按钮 */}
      {completedTasks.length > 0 && onClearCompleted && (
        <div className="mb-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClearCompleted}>
            清除已完成任务
          </Button>
        </div>
      )}

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
                key={task.id}
                className="task-item"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.2 }}
              >
                <div className="task-header">
                  <TaskStatusIcon status={task.status} />
                  <span className="task-name">{task.name}</span>
                </div>

                {task.error && (
                  <p className="task-error">{task.error}</p>
                )}

                {task.status === 'running' && (
                  <div className="task-progress">
                    <div className="progress-bar">
                      <motion.div
                        className="progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${task.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <div className="progress-info">
                      <span className="progress-text">{task.progress}%</span>
                      {task.estimatedTime && (
                        <span className="estimated-time">
                          预计剩余: {formatTime(task.estimatedTime)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="task-actions">
                  {task.status === 'failed' && onRetryTask && (
                    <button
                      className="task-action-btn"
                      onClick={() => onRetryTask(task.id)}
                      title="重试"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {(task.status === 'pending' ||
                    task.status === 'running' ||
                    task.status === 'paused') &&
                    onCancelTask && (
                      <button
                        className="task-action-btn task-action-cancel"
                        onClick={() => onCancelTask(task.id)}
                        title="取消"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * TaskQueueSheet - 任务队列抽屉组件
 *
 * 功能：
 * - 展示所有队列中的任务
 * - 显示任务状态、进度、预计时间
 * - 支持取消/重试单个任务
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/renderer/components/ui/sheet';
import { Button } from '@/renderer/components/ui/button';
import { Badge } from '@/renderer/components/ui/badge';
import { Separator } from '@/renderer/components/ui/separator';
import { X, RotateCw, Play, Pause, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import './TaskQueueSheet.css';

export interface Task {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'text';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number; // 0-100
  estimatedTime?: number; // 秒
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

interface TaskQueueSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  onCancelTask: (taskId: string) => void;
  onRetryTask: (taskId: string) => void;
  onPauseTask: (taskId: string) => void;
  onResumeTask: (taskId: string) => void;
  onClearCompleted: () => void;
}

const TaskStatusIcon: React.FC<{ status: Task['status'] }> = ({ status }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'running':
      return <Play className="h-4 w-4 text-primary" />;
    case 'paused':
      return <Pause className="h-4 w-4 text-muted-foreground" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    default:
      return null;
  }
};

const TaskTypeLabel: React.FC<{ type: Task['type'] }> = ({ type }) => {
  const labels: Record<Task['type'], string> = {
    image: '图像生成',
    video: '视频生成',
    audio: '音频生成',
    text: '文本处理',
  };
  return <span className="text-xs text-muted-foreground">{labels[type]}</span>;
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}分${secs}秒`;
};

export const TaskQueueSheet: React.FC<TaskQueueSheetProps> = ({
  open,
  onOpenChange,
  tasks,
  onCancelTask,
  onRetryTask,
  onPauseTask,
  onResumeTask,
  onClearCompleted,
}) => {
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const runningTasks = tasks.filter((t) => t.status === 'running');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const failedTasks = tasks.filter((t) => t.status === 'failed');
  const pausedTasks = tasks.filter((t) => t.status === 'paused');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[60vh]">
        <SheetHeader>
          <SheetTitle>任务队列</SheetTitle>
          <SheetDescription>
            当前有 {runningTasks.length} 个任务正在执行，{pendingTasks.length} 个任务等待中
          </SheetDescription>
        </SheetHeader>

        <div className="task-queue-summary mt-4 flex gap-4">
          <Badge variant="default">{runningTasks.length} 运行中</Badge>
          <Badge variant="secondary">{pendingTasks.length} 等待中</Badge>
          <Badge variant="outline">{pausedTasks.length} 已暂停</Badge>
          <Badge variant="outline" className="text-green-500">
            {completedTasks.length} 已完成
          </Badge>
          {failedTasks.length > 0 && (
            <Badge variant="destructive">{failedTasks.length} 失败</Badge>
          )}
        </div>

        {completedTasks.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClearCompleted}>
              清除已完成任务
            </Button>
          </div>
        )}

        <Separator className="my-4" />

        <div className="task-list overflow-y-auto" style={{ maxHeight: 'calc(60vh - 200px)' }}>
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              暂无任务
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  className="task-item"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="task-header flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-1">
                        <TaskStatusIcon status={task.status} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium truncate">{task.name}</h4>
                          <TaskTypeLabel type={task.type} />
                        </div>
                        {task.error && (
                          <p className="text-xs text-red-500 mt-1">{task.error}</p>
                        )}
                        {task.status === 'running' && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>进度: {task.progress}%</span>
                              {task.estimatedTime && (
                                <span>预计剩余: {formatTime(task.estimatedTime)}</span>
                              )}
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${task.progress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {task.status === 'running' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => onPauseTask(task.id)}
                          title="暂停"
                        >
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {task.status === 'paused' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => onResumeTask(task.id)}
                          title="恢复"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {task.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => onRetryTask(task.id)}
                          title="重试"
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(task.status === 'pending' ||
                        task.status === 'running' ||
                        task.status === 'paused') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => onCancelTask(task.id)}
                          title="取消"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskQueueSheet;

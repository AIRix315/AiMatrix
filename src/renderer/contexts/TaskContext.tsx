import React, { createContext, useContext, ReactNode } from 'react';
import type { Task } from '../components/common/TaskQueueSheet';

interface TaskContextType {
  tasks: Task[];
  onCancelTask: (taskId: string) => void;
  onRetryTask: (taskId: string) => void;
  onClearCompleted: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTask = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};

interface TaskProviderProps {
  children: ReactNode;
  tasks: Task[];
  onCancelTask: (taskId: string) => void;
  onRetryTask: (taskId: string) => void;
  onClearCompleted: () => void;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({
  children,
  tasks,
  onCancelTask,
  onRetryTask,
  onClearCompleted,
}) => {
  return (
    <TaskContext.Provider
      value={{
        tasks,
        onCancelTask,
        onRetryTask,
        onClearCompleted,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

/**
 * SelectionContext - 全局选中项状态管理
 * 用于在不同组件间共享当前选中的项目信息
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface SelectedItem {
  id: string;
  name: string;
  type: string;
  prompt?: string;
  provider?: string;
  [key: string]: unknown;
}

interface SelectionContextType {
  selectedItem: SelectedItem | null;
  setSelectedItem: (item: SelectedItem | null) => void;
  selectedCount: number;
  setSelectedCount: (count: number) => void;
}

const SelectionContext = createContext<SelectionContextType>({
  selectedItem: null,
  setSelectedItem: () => {},
  selectedCount: 0,
  setSelectedCount: () => {},
});

export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within SelectionProvider');
  }
  return context;
};

interface SelectionProviderProps {
  children: ReactNode;
}

export const SelectionProvider: React.FC<SelectionProviderProps> = ({ children }) => {
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);

  return (
    <SelectionContext.Provider
      value={{
        selectedItem,
        setSelectedItem,
        selectedCount,
        setSelectedCount,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
};

export default SelectionContext;

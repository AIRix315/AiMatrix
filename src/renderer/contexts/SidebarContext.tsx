import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  assetPanelCollapsed: boolean; // 资产面板收放状态
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  toggleAssetPanel: () => void; // 切换资产面板
  setLeftSidebarCollapsed: (collapsed: boolean) => void;
  setRightSidebarCollapsed: (collapsed: boolean) => void;
  setAssetPanelCollapsed: (collapsed: boolean) => void; // 设置资产面板状态
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(true);
  const [assetPanelCollapsed, setAssetPanelCollapsed] = useState(true); // 默认关闭

  const toggleLeftSidebar = () => {
    setLeftSidebarCollapsed(!leftSidebarCollapsed);
  };

  const toggleRightSidebar = () => {
    setRightSidebarCollapsed(!rightSidebarCollapsed);
  };

  const toggleAssetPanel = () => {
    setAssetPanelCollapsed(!assetPanelCollapsed);
  };

  return (
    <SidebarContext.Provider
      value={{
        leftSidebarCollapsed,
        rightSidebarCollapsed,
        assetPanelCollapsed,
        toggleLeftSidebar,
        toggleRightSidebar,
        toggleAssetPanel,
        setLeftSidebarCollapsed,
        setRightSidebarCollapsed,
        setAssetPanelCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

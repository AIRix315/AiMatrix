import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="logo">
          <h1>Matrix AI Workflow</h1>
        </div>
        <nav className="layout-nav">
          <Link 
            to="/dashboard" 
            className={`nav-item ${location.pathname === '/' || location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            仪表板
          </Link>
          <Link 
            to="/projects" 
            className={`nav-item ${location.pathname === '/projects' ? 'active' : ''}`}
          >
            项目
          </Link>
          <Link 
            to="/workflows" 
            className={`nav-item ${location.pathname === '/workflows' ? 'active' : ''}`}
          >
            工作流
          </Link>
          <Link 
            to="/settings" 
            className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}
          >
            设置
          </Link>
        </nav>
      </header>
      <main className="layout-main">
        {children}
      </main>
    </div>
  );
};

export default Layout;
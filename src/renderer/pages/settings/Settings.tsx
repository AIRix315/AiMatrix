import React from 'react';
import './Settings.css';

const Settings: React.FC = () => {
  return (
    <div className="settings">
      <div className="settings-header">
        <h2>设置</h2>
      </div>
      
      <div className="settings-content">
        <div className="settings-section">
          <h3>常规设置</h3>
          <div className="setting-item">
            <label htmlFor="language">界面语言</label>
            <select id="language" className="setting-select">
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
          <div className="setting-item">
            <label htmlFor="theme">主题</label>
            <select id="theme" className="setting-select">
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="auto">跟随系统</option>
            </select>
          </div>
        </div>
        
        <div className="settings-section">
          <h3>服务配置</h3>
          <div className="setting-item">
            <label htmlFor="comfyui-url">ComfyUI 服务地址</label>
            <input 
              id="comfyui-url" 
              type="text" 
              placeholder="http://localhost:8188" 
              className="setting-input"
            />
          </div>
          <div className="setting-item">
            <label htmlFor="mcp-url">MCP 服务地址</label>
            <input 
              id="mcp-url" 
              type="text" 
              placeholder="http://localhost:8080" 
              className="setting-input"
            />
          </div>
          <div className="setting-item">
            <label htmlFor="n8n-url">n8n 服务地址</label>
            <input 
              id="n8n-url" 
              type="text" 
              placeholder="http://localhost:5678" 
              className="setting-input"
            />
          </div>
        </div>
        
        <div className="settings-actions">
          <button className="btn-primary">保存设置</button>
          <button className="btn-secondary">重置默认</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
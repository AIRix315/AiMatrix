// Polyfill for global (required for some dependencies)
(window as any).global = window;

// 检查预加载脚本是否成功加载
if (!window.electronAPI) {
    console.error('[Renderer] FATAL: electronAPI is not defined! Preload script failed to load.');

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('root');
        if (root) {
            root.innerHTML = `
                <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
                    <h1 style="color: #e53935;">预加载脚本加载失败</h1>
                    <p style="color: #666;">electronAPI 未定义，请检查:</p>
                    <ul style="color: #666; text-align: left;">
                        <li>预加载脚本是否正确编译到 build/preload/index.js</li>
                        <li>window.ts 中的预加载脚本路径是否正确</li>
                        <li>控制台是否有预加载脚本的错误信息</li>
                    </ul>
                    <p style="color: #999; font-size: 12px;">按 F12 打开开发者工具查看详细错误</p>
                </div>
            `;
        }
    });

    throw new Error('electronAPI is not defined - preload script failed');
}

console.log('[Renderer] electronAPI loaded successfully');

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/base.css';
import './styles/theme.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/views.css';
import './styles/editor.css';
import './styles/settings.css';

const container = document.getElementById('root');
if (!container) {
    console.error('[Renderer] FATAL: Root element not found');
    throw new Error('Root element not found');
}

console.log('[Renderer] Starting React application...');

try {
    const root = createRoot(container);
    root.render(<App />);
    console.log('[Renderer] React application started successfully');
} catch (error) {
    console.error('[Renderer] FATAL: Failed to start React application:', error);

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
            <h1 style="color: #e53935;">应用启动失败</h1>
            <p style="color: #666;">请打开开发者工具查看详细错误信息</p>
            <p style="color: #999; font-size: 12px;">按 F12 打开开发者工具</p>
        </div>
    `;
}

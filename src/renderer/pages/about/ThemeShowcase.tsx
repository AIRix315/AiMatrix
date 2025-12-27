import React, { useState } from 'react';
import './ThemeShowcase.css';

interface ColorToken {
  name: string;
  value: string;
  description: string;
}

const ThemeShowcase: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'colors' | 'typography' | 'radius'>('colors');

  const colorTokens: ColorToken[] = [
    { name: '--background', value: 'oklch(0.12 0 0)', description: '背景色 - 深黑' },
    { name: '--foreground', value: 'oklch(0.92 0 0)', description: '前景色 - 亮白' },
    { name: '--card', value: 'oklch(0.16 0 0)', description: '卡片背景' },
    { name: '--primary', value: 'oklch(0.85 0.22 160)', description: '主色调 - 电绿' },
    { name: '--secondary', value: 'oklch(0.2 0 0)', description: '次要色' },
    { name: '--muted', value: 'oklch(0.24 0 0)', description: '柔和色' },
    { name: '--accent', value: 'oklch(0.85 0.22 160)', description: '强调色 - 电绿' },
    { name: '--destructive', value: 'oklch(0.577 0.245 27.325)', description: '警告色 - 红' },
    { name: '--border', value: 'oklch(0.24 0 0)', description: '边框色' },
    { name: '--input', value: 'oklch(0.2 0 0)', description: '输入框背景' },
    { name: '--ring', value: 'oklch(0.85 0.22 160)', description: '聚焦环 - 电绿' },
  ];

  const chartColors: ColorToken[] = [
    { name: '--chart-1', value: 'oklch(0.85 0.22 160)', description: '图表色1 - 电绿' },
    { name: '--chart-2', value: 'oklch(0.7 0.18 200)', description: '图表色2 - 青蓝' },
    { name: '--chart-3', value: 'oklch(0.75 0.15 280)', description: '图表色3 - 紫色' },
    { name: '--chart-4', value: 'oklch(0.8 0.2 120)', description: '图表色4 - 黄绿' },
    { name: '--chart-5', value: 'oklch(0.65 0.2 320)', description: '图表色5 - 粉紫' },
  ];

  const sidebarColors: ColorToken[] = [
    { name: '--sidebar', value: 'oklch(0.1 0 0)', description: '侧边栏背景' },
    { name: '--sidebar-foreground', value: 'oklch(0.85 0 0)', description: '侧边栏前景' },
    { name: '--sidebar-primary', value: 'oklch(0.85 0.22 160)', description: '侧边栏主色' },
    { name: '--sidebar-accent', value: 'oklch(0.18 0 0)', description: '侧边栏强调' },
    { name: '--sidebar-border', value: 'oklch(0.2 0 0)', description: '侧边栏边框' },
  ];

  const fonts = [
    { name: 'Inter', type: 'Sans-serif', usage: '界面文字' },
    { name: 'JetBrains Mono', type: 'Monospace', usage: '代码/数据' },
  ];

  const radiusTokens = [
    { name: '--radius-sm', value: 'calc(0.5rem - 4px)', px: '4px' },
    { name: '--radius-md', value: 'calc(0.5rem - 2px)', px: '6px' },
    { name: '--radius-lg', value: '0.5rem', px: '8px' },
    { name: '--radius-xl', value: 'calc(0.5rem + 4px)', px: '12px' },
  ];

  return (
    <div className="theme-showcase">
      <div className="showcase-header">
        <h3>🎨 MATRIX Studio V2 设计系统</h3>
        <p className="showcase-subtitle">基于 OKLCH 色彩空间的深色赛博朋克主题</p>
      </div>

      <div className="showcase-tabs">
        <button
          className={`showcase-tab ${activeSection === 'colors' ? 'active' : ''}`}
          onClick={() => setActiveSection('colors')}
        >
          调色板
        </button>
        <button
          className={`showcase-tab ${activeSection === 'typography' ? 'active' : ''}`}
          onClick={() => setActiveSection('typography')}
        >
          字体系统
        </button>
        <button
          className={`showcase-tab ${activeSection === 'radius' ? 'active' : ''}`}
          onClick={() => setActiveSection('radius')}
        >
          圆角规范
        </button>
      </div>

      <div className="showcase-content">
        {activeSection === 'colors' && (
          <div className="colors-section">
            <div className="color-group">
              <h4>基础色彩</h4>
              <div className="color-grid">
                {colorTokens.map((token) => (
                  <div key={token.name} className="color-card">
                    <div
                      className="color-preview"
                      style={{ backgroundColor: token.value }}
                    />
                    <div className="color-info">
                      <code className="color-name">{token.name}</code>
                      <span className="color-description">{token.description}</span>
                      <code className="color-value">{token.value}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="color-group">
              <h4>图表色彩</h4>
              <div className="color-grid">
                {chartColors.map((token) => (
                  <div key={token.name} className="color-card">
                    <div
                      className="color-preview"
                      style={{ backgroundColor: token.value }}
                    />
                    <div className="color-info">
                      <code className="color-name">{token.name}</code>
                      <span className="color-description">{token.description}</span>
                      <code className="color-value">{token.value}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="color-group">
              <h4>侧边栏色彩</h4>
              <div className="color-grid">
                {sidebarColors.map((token) => (
                  <div key={token.name} className="color-card">
                    <div
                      className="color-preview"
                      style={{ backgroundColor: token.value }}
                    />
                    <div className="color-info">
                      <code className="color-name">{token.name}</code>
                      <span className="color-description">{token.description}</span>
                      <code className="color-value">{token.value}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'typography' && (
          <div className="typography-section">
            <div className="font-group">
              {fonts.map((font) => (
                <div key={font.name} className="font-card">
                  <div className="font-preview" style={{ fontFamily: font.name }}>
                    <div className="font-sample-large">Aa Bb Cc 123</div>
                    <div className="font-sample-text">
                      The quick brown fox jumps over the lazy dog
                    </div>
                    <div className="font-sample-chinese">
                      MATRIX Studio 视频工作流管理平台
                    </div>
                  </div>
                  <div className="font-info">
                    <h4>{font.name}</h4>
                    <span className="font-type">{font.type}</span>
                    <span className="font-usage">用途：{font.usage}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="tech-stack">
              <h4>技术栈</h4>
              <div className="tech-tags">
                <span className="tech-tag">Tailwind CSS v4</span>
                <span className="tech-tag">shadcn/ui</span>
                <span className="tech-tag">Radix UI</span>
                <span className="tech-tag">Framer Motion</span>
                <span className="tech-tag">OKLCH 色彩空间</span>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'radius' && (
          <div className="radius-section">
            <div className="radius-grid">
              {radiusTokens.map((token) => (
                <div key={token.name} className="radius-card">
                  <div
                    className="radius-preview"
                    style={{ borderRadius: token.value }}
                  >
                    <span className="radius-label">{token.px}</span>
                  </div>
                  <div className="radius-info">
                    <code className="radius-name">{token.name}</code>
                    <code className="radius-value">{token.value}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="showcase-footer">
        <p>📍 参考路径：<code>docs/references/UI/V2</code></p>
      </div>
    </div>
  );
};

export default ThemeShowcase;

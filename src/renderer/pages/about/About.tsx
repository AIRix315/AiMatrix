import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeShowcase from './ThemeShowcase';
import './About.css';

const About: React.FC = () => {
  const navigate = useNavigate();
  const [showTheme, setShowTheme] = useState(false);

  return (
    <div className="about-page">
      <div className="about-content">
        <h2 style={{ marginBottom: '10px', color: 'var(--accent-color)' }}>MATRIX Studio</h2>
        <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '20px' }}>Version v0.2.9.5</p>
        <p style={{ color: '#666', fontSize: '11px', marginBottom: '20px' }}>All systems operational.</p>

        <div style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/demo')}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: 'var(--accent-color)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            🎨 查看 UI 组件演示
          </button>

          <button
            onClick={() => setShowTheme(!showTheme)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: showTheme ? 'var(--accent-color)' : 'transparent',
              color: showTheme ? '#000' : '#aaa',
              border: `1px solid ${showTheme ? 'var(--accent-color)' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!showTheme) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showTheme) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            🌈 {showTheme ? '隐藏' : '查看'}全局主题
          </button>
        </div>

        {showTheme && (
          <div style={{ marginTop: '40px', width: '100%' }}>
            <ThemeShowcase />
          </div>
        )}
      </div>
    </div>
  );
};

export default About;

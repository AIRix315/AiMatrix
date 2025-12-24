import React from 'react';
import './About.css';

const About: React.FC = () => {
  return (
    <div className="about-page">
      <div className="about-content">
        <h2 style={{ marginBottom: '10px', color: 'var(--accent-color)' }}>MATRIX Studio</h2>
        <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '20px' }}>Version 14.0</p>
        <p style={{ color: '#666', fontSize: '11px', marginBottom: '20px' }}>All systems operational.</p>
        <button className="action-btn primary" onClick={() => window.close()}>
          Close
        </button>
      </div>
    </div>
  );
};

export default About;

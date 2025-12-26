import React from 'react';
import './About.css';

const About: React.FC = () => {
  return (
    <div className="about-page">
      <div className="about-content">
        <h2 style={{ marginBottom: '10px', color: 'var(--accent-color)' }}>MATRIX Studio</h2>
        <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '20px' }}>Version v0.2.9</p>
        <p style={{ color: '#666', fontSize: '11px', marginBottom: '20px' }}>All systems operational.</p>
      </div>
    </div>
  );
};

export default About;

import React from 'react';
import './Loading.css';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullscreen?: boolean;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  message,
  fullscreen = false
}) => {
  const content = (
    <div className="loading-content">
      <div className={`loading-spinner ${size}`}>
        <div className="spinner-ring"></div>
      </div>
      {message && <div className="loading-message">{message}</div>}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="loading-overlay">
        {content}
      </div>
    );
  }

  return content;
};

export default Loading;

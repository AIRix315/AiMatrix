import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/theme.css';
import './styles/global.css';
import './styles/layout.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<App />);
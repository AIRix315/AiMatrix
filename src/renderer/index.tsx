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
    throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<App />);

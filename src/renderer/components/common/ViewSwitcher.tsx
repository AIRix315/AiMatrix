import React from 'react';
import { Grid3x3, List } from 'lucide-react';
import './ViewSwitcher.css';

interface ViewSwitcherProps {
  viewMode: 'grid' | 'list';
  onChange: (mode: 'grid' | 'list') => void;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ viewMode, onChange }) => {
  return (
    <div className="view-switcher">
      <button
        className={`view-switch-btn ${viewMode === 'grid' ? 'active' : ''}`}
        onClick={() => onChange('grid')}
        title="网格视图"
      >
        <Grid3x3 size={18} />
      </button>
      <button
        className={`view-switch-btn ${viewMode === 'list' ? 'active' : ''}`}
        onClick={() => onChange('list')}
        title="列表视图"
      >
        <List size={18} />
      </button>
    </div>
  );
};

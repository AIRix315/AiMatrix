import React from 'react';
import './ListView.css';

interface ListViewItemProps {
  id: string;
  preview: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  onClick?: () => void;
}

export const ListViewItem: React.FC<ListViewItemProps> = ({
  preview,
  title,
  description,
  actions,
  onClick
}) => {
  return (
    <div className="list-item" onClick={onClick}>
      <img className="thumbnail" src={preview} alt={title} />
      <div className="info">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
};

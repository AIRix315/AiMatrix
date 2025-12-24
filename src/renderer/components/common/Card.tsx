import React from 'react';
import './Card.css';

interface CardProps {
  tag?: string;
  image?: string;
  title: string;
  info?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  tag,
  image,
  title,
  info,
  hoverable = true,
  onClick
}) => {
  return (
    <div
      className={`project-card ${hoverable ? 'hoverable' : ''}`}
      onClick={onClick}
    >
      {tag && <div className="card-tag">{tag}</div>}
      <div className="card-img">{image}</div>
      <div className="card-body">
        <div className="card-name">{title}</div>
        {info && <div className="card-info">{info}</div>}
      </div>
    </div>
  );
};

export default Card;
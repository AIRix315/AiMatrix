import React from 'react';
import './Card.css';

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  tag?: string;
  image?: string;
  title?: string;
  subtitle?: string;
  info?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
  tag,
  image,
  title,
  subtitle,
  info,
  ...props
}) => {
  const classes = [
    'project-card',
    hoverable && 'hoverable',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} onClick={onClick} {...props}>
      {tag && <div className="card-tag">{tag}</div>}
      {image && (
        <div className="card-img">
          {image.startsWith('http') ? (
            <img src={image} alt={title} />
          ) : (
            <span>{image}</span>
          )}
        </div>
      )}
      <div className="card-body">
        {title && <div className="card-name">{title}</div>}
        {subtitle && <div className="card-subtitle">{subtitle}</div>}
        {info && <div className="card-info">{info}</div>}
        {children}
      </div>
    </div>
  );
};

export default Card;
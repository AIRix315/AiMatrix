import React from 'react';
import './Button.css';

interface ButtonProps {
  variant?: 'primary' | 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  disabled = false,
  onClick,
  children,
  title,
  className,
  style
}) => {
  return (
    <button
      className={`action-btn ${variant} ${size} ${disabled ? 'disabled' : ''} ${className || ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={style}
    >
      {children}
    </button>
  );
};

export default Button;
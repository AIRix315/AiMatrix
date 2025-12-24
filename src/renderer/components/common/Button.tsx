import React from 'react';
import './Button.css';

interface ButtonProps {
  variant?: 'primary' | 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  title?: string;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  disabled = false,
  onClick,
  children,
  title
}) => {
  return (
    <button
      className={`action-btn ${variant} ${size} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
};

export default Button;
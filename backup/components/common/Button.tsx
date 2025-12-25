import React from 'react';
import './Button.css';

interface ButtonProps {
  variant?: 'primary' | 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  variant = 'ghost',
  size = 'md',
  disabled = false,
  active = false,
  className = '',
  children,
  onClick,
  type = 'button',
  ...props
}) => {
  const classes = [
    'action-btn',
    variant && `action-btn-${variant}`,
    size && `action-btn-${size}`,
    disabled && 'disabled',
    active && 'active',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
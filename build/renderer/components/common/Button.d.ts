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
declare const Button: React.FC<ButtonProps>;
export default Button;

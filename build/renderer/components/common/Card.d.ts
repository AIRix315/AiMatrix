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
declare const Card: React.FC<CardProps>;
export default Card;

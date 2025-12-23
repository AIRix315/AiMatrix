import React from 'react';
interface IconProps {
    name: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    color?: string;
}
declare const Icon: React.FC<IconProps>;
export default Icon;

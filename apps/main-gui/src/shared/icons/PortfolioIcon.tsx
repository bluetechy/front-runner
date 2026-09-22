import React from 'react';
import { FaLink } from 'react-icons/fa6';
import type IconProps from '@/shared/icons/IconProps';

const PortfolioIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <FaLink style={{ fill : color }} size={size} />;
};

export const PortfolioIcon: React.FC<IconProps> = PortfolioIconFactory;
export default PortfolioIcon;

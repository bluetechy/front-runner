import React from 'react';
import { FaXTwitter } from 'react-icons/fa6';
import type IconProps from '@/shared/icons/IconProps';

const TwitterIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <FaXTwitter style={{ fill : color }} size={size} />;
};

export const TwitterIcon: React.FC<IconProps> = TwitterIconFactory;
export default TwitterIcon;

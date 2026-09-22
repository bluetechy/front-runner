import React from 'react';
import { FaXTwitter } from 'react-icons/fa6';
import type IconProps from '@/shared/icons/IconProps';

const TwitterIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <FaXTwitter style={{ fill : color }} size={size} />;
};

export const TwitterIcon: React.FC<IconProps> = TwitterIconFactory;
export default TwitterIcon;

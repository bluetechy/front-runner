import React from 'react';
import { FaTiktok } from 'react-icons/fa6';
import type IconProps from '@/shared/icons/IconProps';

const TikTokIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <FaTiktok style={{ fill : color }} size={size} />;
};

export const TikTokIcon: React.FC<IconProps> = TikTokIconFactory;
export default TikTokIcon;

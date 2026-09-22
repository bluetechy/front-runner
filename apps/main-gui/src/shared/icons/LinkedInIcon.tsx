import React from 'react';
import { FaLinkedinIn } from 'react-icons/fa6';
import type IconProps from '@/shared/icons/IconProps';

const LinkedInIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <FaLinkedinIn style={{ fill : color }} size={size} />;
};

export const LinkedInIcon: React.FC<IconProps> = LinkedInIconFactory;
export default LinkedInIcon;

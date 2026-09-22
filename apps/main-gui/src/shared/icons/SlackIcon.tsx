import React from 'react';
import { FaSlack } from 'react-icons/fa6';
import type IconProps from '@/shared/icons/IconProps';

const SlackIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <FaSlack style={{ fill : color }} size={size} />;
};

export const SlackIcon: React.FC<IconProps> = SlackIconFactory;
export default SlackIcon;

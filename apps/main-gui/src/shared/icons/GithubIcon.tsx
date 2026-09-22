import React from 'react';
import { FaGithub } from 'react-icons/fa6';
import type IconProps from '@/shared/icons/IconProps';

const GithubIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <FaGithub style={{ fill : color }} size={size} />;
};

export const GithubIcon: React.FC<IconProps> = GithubIconFactory;
export default GithubIcon;

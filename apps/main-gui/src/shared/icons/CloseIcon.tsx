import React from 'react';
import { GoXCircle } from "react-icons/go";
import type IconProps from '@/shared/icons/IconProps';

const CloseIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <GoXCircle style={{ fill : color }} size={size} />;
};

export const CloseIcon: React.FC<IconProps> = CloseIconFactory;
export default CloseIcon;

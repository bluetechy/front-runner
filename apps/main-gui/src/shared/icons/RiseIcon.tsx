import React from 'react';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` is black by default,
 * the same contract every wrapper in here keeps; a caller that wants the icon
 * to take the colour of whatever encloses it passes `currentColor`. */
const RiseIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <ArrowUpwardRounded style={{ fill : color, fontSize : size }} />;
};

export const RiseIcon: React.FC<IconProps> = RiseIconFactory;
export default RiseIcon;

import React from 'react';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const RiseIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <ArrowUpwardRounded style={{ fill : color, fontSize : size }} />;
};

export const RiseIcon: React.FC<IconProps> = RiseIconFactory;
export default RiseIcon;

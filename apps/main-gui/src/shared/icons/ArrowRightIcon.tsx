import React from 'react';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const ArrowRightIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <ArrowForwardRounded style={{ fill : color, fontSize : size }} />;
};

export const ArrowRightIcon: React.FC<IconProps> = ArrowRightIconFactory;
export default ArrowRightIcon;

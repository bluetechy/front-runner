import React from 'react';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const FallIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <ArrowDownwardRounded style={{ fill : color, fontSize : size }} />;
};

export const FallIcon: React.FC<IconProps> = FallIconFactory;
export default FallIcon;

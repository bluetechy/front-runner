import React from 'react';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const ChevronDownIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <ExpandMoreRounded style={{ fill : color, fontSize : size }} />;
};

export const ChevronDownIcon: React.FC<IconProps> = ChevronDownIconFactory;
export default ChevronDownIcon;

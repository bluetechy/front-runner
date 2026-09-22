import React from 'react';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` is black by default,
 * the same contract every wrapper in here keeps; a caller that wants the icon
 * to take the colour of whatever encloses it passes `currentColor`. */
const ChevronDownIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <ExpandMoreRounded style={{ fill : color, fontSize : size }} />;
};

export const ChevronDownIcon: React.FC<IconProps> = ChevronDownIconFactory;
export default ChevronDownIcon;

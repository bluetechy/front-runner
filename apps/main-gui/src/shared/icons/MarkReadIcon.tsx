import React from 'react';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` is black by default,
 * the same contract every wrapper in here keeps; a caller that wants the icon
 * to take the colour of whatever encloses it passes `currentColor`. */
const MarkReadIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <MarkEmailReadRounded style={{ fill : color, fontSize : size }} />;
};

export const MarkReadIcon: React.FC<IconProps> = MarkReadIconFactory;
export default MarkReadIcon;

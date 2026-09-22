import React from 'react';
import Facebook from '@mui/icons-material/Facebook';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` is black by default,
 * the same contract every wrapper in here keeps; a caller that wants the icon
 * to take the colour of whatever encloses it passes `currentColor`. */
const FacebookIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <Facebook style={{ fill : color, fontSize : size }} />;
};

export const FacebookIcon: React.FC<IconProps> = FacebookIconFactory;
export default FacebookIcon;

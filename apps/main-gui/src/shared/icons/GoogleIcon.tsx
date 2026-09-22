import React from 'react';
import Google from '@mui/icons-material/Google';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const GoogleIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <Google style={{ fill : color, fontSize : size }} />;
};

export const GoogleIcon: React.FC<IconProps> = GoogleIconFactory;
export default GoogleIcon;

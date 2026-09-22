import React from 'react';
import StorefrontRounded from '@mui/icons-material/StorefrontRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const StoresIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <StorefrontRounded style={{ fill : color, fontSize : size }} />;
};

export const StoresIcon: React.FC<IconProps> = StoresIconFactory;
export default StoresIcon;

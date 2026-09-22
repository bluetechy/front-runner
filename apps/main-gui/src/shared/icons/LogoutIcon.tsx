import React from 'react';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const LogoutIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <LogoutRounded style={{ fill : color, fontSize : size }} />;
};

export const LogoutIcon: React.FC<IconProps> = LogoutIconFactory;
export default LogoutIcon;

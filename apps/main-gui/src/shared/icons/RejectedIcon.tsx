import React from 'react';
import CancelRounded from '@mui/icons-material/CancelRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const RejectedIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <CancelRounded style={{ fill : color, fontSize : size }} />;
};

export const RejectedIcon: React.FC<IconProps> = RejectedIconFactory;
export default RejectedIcon;

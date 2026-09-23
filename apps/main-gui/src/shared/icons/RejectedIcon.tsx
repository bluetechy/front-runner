import React from 'react';
import CancelRounded from '@mui/icons-material/CancelRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` is black by default,
 * the same contract every wrapper in here keeps; a caller that wants the icon
 * to take the color of whatever encloses it passes `currentColor`. */
const RejectedIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <CancelRounded style={{ fill : color, fontSize : size }} />;
};

export const RejectedIcon: React.FC<IconProps> = RejectedIconFactory;
export default RejectedIcon;

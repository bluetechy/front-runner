import React from 'react';
import AlarmRounded from '@mui/icons-material/AlarmRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` is black by default,
 * the same contract every wrapper in here keeps; a caller that wants the icon
 * to take the colour of whatever encloses it passes `currentColor`. */
const OverdueIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <AlarmRounded style={{ fill : color, fontSize : size }} />;
};

export const OverdueIcon: React.FC<IconProps> = OverdueIconFactory;
export default OverdueIcon;

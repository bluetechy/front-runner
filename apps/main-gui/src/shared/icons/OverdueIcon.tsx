import React from 'react';
import AlarmRounded from '@mui/icons-material/AlarmRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const OverdueIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <AlarmRounded style={{ fill : color, fontSize : size }} />;
};

export const OverdueIcon: React.FC<IconProps> = OverdueIconFactory;
export default OverdueIcon;

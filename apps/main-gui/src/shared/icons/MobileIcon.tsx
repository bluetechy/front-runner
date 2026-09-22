import React from 'react';
import SmartphoneRounded from '@mui/icons-material/SmartphoneRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const MobileIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <SmartphoneRounded style={{ fill : color, fontSize : size }} />;
};

export const MobileIcon: React.FC<IconProps> = MobileIconFactory;
export default MobileIcon;

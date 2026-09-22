import React from 'react';
import AutorenewRounded from '@mui/icons-material/AutorenewRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const ProcessingIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <AutorenewRounded style={{ fill : color, fontSize : size }} />;
};

export const ProcessingIcon: React.FC<IconProps> = ProcessingIconFactory;
export default ProcessingIcon;

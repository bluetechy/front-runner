import React from 'react';
import AlternateEmailRounded from '@mui/icons-material/AlternateEmailRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const MentionIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <AlternateEmailRounded style={{ fill : color, fontSize : size }} />;
};

export const MentionIcon: React.FC<IconProps> = MentionIconFactory;
export default MentionIcon;

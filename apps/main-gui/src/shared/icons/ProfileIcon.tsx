import React from 'react';
import PersonRounded from '@mui/icons-material/PersonRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const ProfileIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <PersonRounded style={{ fill : color, fontSize : size }} />;
};

export const ProfileIcon: React.FC<IconProps> = ProfileIconFactory;
export default ProfileIcon;

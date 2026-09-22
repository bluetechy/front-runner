import React from 'react';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` is black by default,
 * the same contract every wrapper in here keeps; a caller that wants the icon
 * to take the colour of whatever encloses it passes `currentColor`. */
const TrashIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <DeleteOutlineRounded style={{ fill : color, fontSize : size }} />;
};

export const TrashIcon: React.FC<IconProps> = TrashIconFactory;
export default TrashIcon;

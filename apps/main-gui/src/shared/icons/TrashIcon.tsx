import React from 'react';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const TrashIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <DeleteOutlineRounded style={{ fill : color, fontSize : size }} />;
};

export const TrashIcon: React.FC<IconProps> = TrashIconFactory;
export default TrashIcon;

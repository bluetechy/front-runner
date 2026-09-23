import React from 'react';
import DeleteRounded from '@mui/icons-material/DeleteRounded';
import type IconProps from '@/shared/icons/IconProps';

/* The solid bin rather than the outlined one. Outlined, at the size a row
 * action is drawn, it was a few hairlines in a red that is already quiet on
 * card paper; filled, the same glyph is a shape rather than a drawing of one.
 *
 * MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` is black by default,
 * the same contract every wrapper in here keeps; a caller that wants the icon
 * to take the color of whatever encloses it passes `currentColor`. */
const TrashIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <DeleteRounded style={{ fill : color, fontSize : size }} />;
};

export const TrashIcon: React.FC<IconProps> = TrashIconFactory;
export default TrashIcon;

import React from 'react';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import type IconProps from '@/shared/icons/IconProps';

/* An eye, for the control that opens something to be read rather than
 * changed. Named for the glyph the way `BellIcon` and `MailIcon` are, because
 * an eye means the same thing wherever it is put: this shows you a thing.
 *
 * MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` is black by default,
 * the same contract every wrapper in here keeps; a caller that wants the icon
 * to take the color of whatever encloses it passes `currentColor`. */
const EyeIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <VisibilityRounded style={{ fill : color, fontSize : size }} />;
};

export const EyeIcon: React.FC<IconProps> = EyeIconFactory;
export default EyeIcon;

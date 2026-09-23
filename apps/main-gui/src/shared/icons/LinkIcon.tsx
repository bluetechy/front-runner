import React from 'react';
import LinkRounded from '@mui/icons-material/LinkRounded';
import type IconProps from '@/shared/icons/IconProps';

/* The link in a message somebody has to open: the verification mail the
 * security page sends, and whatever follows. Named for that job rather than
 * for the chain the glyph draws.
 *
 * MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` is black by default,
 * the same contract every wrapper in here keeps; a caller that wants the icon
 * to take the color of whatever encloses it passes `currentColor`. */
const LinkIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <LinkRounded style={{ fill : color, fontSize : size }} />;
};

export const LinkIcon: React.FC<IconProps> = LinkIconFactory;
export default LinkIcon;

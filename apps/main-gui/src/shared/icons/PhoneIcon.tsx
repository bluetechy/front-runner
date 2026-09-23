import React from 'react';
import PhoneRounded from '@mui/icons-material/PhoneRounded';
import type IconProps from '@/shared/icons/IconProps';

/* The handset off a desk phone, not a smartphone: this is the icon over a
 * number somebody rings, where the thing being drawn is the call rather than
 * the device it is made on. `MobileIcon` stays the smartphone, for the mobile
 * number on a profile.
 *
 * MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` is black by default,
 * the same contract every wrapper in here keeps; a caller that wants the icon
 * to take the colour of whatever encloses it passes `currentColor`. */
const PhoneIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <PhoneRounded style={{ fill : color, fontSize : size }} />;
};

export const PhoneIcon: React.FC<IconProps> = PhoneIconFactory;
export default PhoneIcon;

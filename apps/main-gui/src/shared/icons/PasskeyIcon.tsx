import React from 'react';
import KeyRounded from '@mui/icons-material/KeyRounded';
import type IconProps from '@/shared/icons/IconProps';

/* A key, for the credential that is one. A fingerprint was the other
 * candidate and says less than it looks like it does: a passkey is unlocked
 * by a fingerprint on a laptop, by a face on a phone and by a button on a
 * plastic key on a keyring, and only one of those is a fingerprint. What all
 * three have in common is the thing itself.
 *
 * MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` is black by default,
 * the same contract every wrapper in here keeps; a caller that wants the icon
 * to take the color of whatever encloses it passes `currentColor`. */
const PasskeyIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <KeyRounded style={{ fill : color, fontSize : size }} />;
};

export const PasskeyIcon: React.FC<IconProps> = PasskeyIconFactory;
export default PasskeyIcon;

import React from 'react';
import InsightsRounded from '@mui/icons-material/InsightsRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` is black by default,
 * the same contract every wrapper in here keeps; a caller that wants the icon
 * to take the color of whatever encloses it passes `currentColor`. */
const KpiIconFactory: React.FC<IconProps> = ({ color = '#000000', size = 16 }) => {
	return <InsightsRounded style={{ fill : color, fontSize : size }} />;
};

export const KpiIcon: React.FC<IconProps> = KpiIconFactory;
export default KpiIcon;

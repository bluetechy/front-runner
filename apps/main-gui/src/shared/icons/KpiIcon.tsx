import React from 'react';
import InsightsRounded from '@mui/icons-material/InsightsRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const KpiIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <InsightsRounded style={{ fill : color, fontSize : size }} />;
};

export const KpiIcon: React.FC<IconProps> = KpiIconFactory;
export default KpiIcon;

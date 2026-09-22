import React from 'react';
import FactCheckRounded from '@mui/icons-material/FactCheckRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const ApprovalIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <FactCheckRounded style={{ fill : color, fontSize : size }} />;
};

export const ApprovalIcon: React.FC<IconProps> = ApprovalIconFactory;
export default ApprovalIcon;

import React from 'react';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const ScheduleIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <CalendarMonthRounded style={{ fill : color, fontSize : size }} />;
};

export const ScheduleIcon: React.FC<IconProps> = ScheduleIconFactory;
export default ScheduleIcon;

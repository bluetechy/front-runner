import React from 'react';
import AssignmentRounded from '@mui/icons-material/AssignmentRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const TaskIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <AssignmentRounded style={{ fill : color, fontSize : size }} />;
};

export const TaskIcon: React.FC<IconProps> = TaskIconFactory;
export default TaskIcon;

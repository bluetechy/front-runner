import React from 'react';
import EmojiEventsRounded from '@mui/icons-material/EmojiEventsRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const AchievementsIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <EmojiEventsRounded style={{ fill : color, fontSize : size }} />;
};

export const AchievementsIcon: React.FC<IconProps> = AchievementsIconFactory;
export default AchievementsIcon;

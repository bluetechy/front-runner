import React from 'react';
import PhotoCameraRounded from '@mui/icons-material/PhotoCameraRounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const CameraIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <PhotoCameraRounded style={{ fill : color, fontSize : size }} />;
};

export const CameraIcon: React.FC<IconProps> = CameraIconFactory;
export default CameraIcon;

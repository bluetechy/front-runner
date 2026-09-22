import React from 'react';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import type IconProps from '@/shared/icons/IconProps';

/* MUI sizes its icons by font-size -- the svg is 1em square -- so `size`
 * lands on fontSize rather than width/height. `color` defaults to
 * currentColor so the icon takes the colour of whatever encloses it; pass one
 * only to override that. */
const ProductsIconFactory: React.FC<IconProps> = ({ color = 'currentColor', size = 16 }) => {
	return <Inventory2Rounded style={{ fill : color, fontSize : size }} />;
};

export const ProductsIcon: React.FC<IconProps> = ProductsIconFactory;
export default ProductsIcon;

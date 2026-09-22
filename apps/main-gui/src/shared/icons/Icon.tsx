import React from 'react';
import SvgIcon from './SvgIcon';
import type { Glyph } from '@/shared/icons/glyphs';

export interface IconProps {
	className?: string;
	icon: Glyph;
	size?: number | string;
	style?: React.CSSProperties;
	tag?: 'i' | 'span' | 'div';
	title?: string;
	[key: string]: any;
}

export const Icon: React.FC<IconProps> = ({ style = undefined, className = '', icon, size = 16, tag = 'i', title = '', ...others }) => {
	const Tag = tag;

	return (
		<Tag {...others} style={{ display : 'inline-block',...style }} className={className}>
			<SvgIcon size={size} icon={icon} title={title} />
		</Tag>
	);
};

export default Icon;

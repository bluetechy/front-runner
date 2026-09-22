import React, { createElement } from 'react';
import { isNotUndefOrNull } from '@/shared/lib/common';
import type { Glyph, GlyphNode } from '@/shared/icons/glyphs';

const camelcase = (str: string) => str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

const expandStyle = (style = '') => {
	return style.split(';').reduce((partial: Record<string, string>, next) => {
		// next h ere is key:val
		const [key, val] = next.split(':');
		if (isNotUndefOrNull(key) && isNotUndefOrNull(val)) {
			partial[camelcase(key)] = val;
		}
		return partial;
	}, {});
};

const walkChildren = (children: GlyphNode[]): React.ReactNode[] => {
	return children.map((child, idx) => {
		const { name, attribs : attribsMap = {}, children : gchildren = null } = child;

		//fill, stroke
		const attribs = Object.keys(attribsMap)
		.filter( key => key !== 'fill' && key !== 'stroke' && attribsMap[key] !== 'none' )
		.reduce( (partial: Record<string, unknown>, key) => {
			if (key === 'style') {
				partial.style = expandStyle(attribsMap[key]);
			} else {
				partial[camelcase(key)] = attribsMap[key];
			}
			return partial;
		}, {} );
		//special case, it has fill and stroke at the same time
		let merge: Record<string, string> = {};
		if ( attribsMap.fill === 'none' && attribsMap.stroke ) {
			merge = { fill : 'none', stroke : 'currentColor' };
		} else if ( attribsMap.fill === 'none' ) {
			merge = { fill : 'none' };
		}
		return createElement(name, { key : idx, ...attribs, ...merge }, gchildren === null ? gchildren : walkChildren(gchildren));
	});
};

export interface SvgIconProps {
	icon: Glyph;
	/** The icon tests pass '24' as a string on purpose — see docs/shared/icons.md. */
	size?: number | string;
	title?: string | null;
}

export const SvgIcon: React.FC<SvgIconProps> = ({ size, icon, title = null }) => {
	const { children = [], viewBox, attribs : svgAttribs = {}} = icon;

	const camelCasedAttribs = Object.keys(svgAttribs).reduce( (partial: Record<string, string>, key) => {
		partial[camelcase(key)] = svgAttribs[key]!;
		return partial;
	}, {});

	return (
		<svg fill='currentColor' style={{ display : 'inline-block', verticalAlign : 'middle' }} height={size} width={size} viewBox={viewBox} {...camelCasedAttribs }>
			{ title ? <title>{title}</title> : null }
			{ walkChildren(children) }
		</svg>
	);
};

export default SvgIcon;

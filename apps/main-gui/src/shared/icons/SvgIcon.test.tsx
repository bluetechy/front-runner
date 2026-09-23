import { render } from '@testing-library/react';
import { SvgIcon } from '@/shared/icons/SvgIcon';
import type { Glyph } from '@/shared/icons/glyphs';

// The <svg> itself, which `Icon` only wraps in a tag. What is covered here is what the
// walker does to a glyph's raw attribute strings on the way to being React props:
// hyphenated names become camelCase, a `style` string becomes an object, and children
// nest as deep as the data does.
//
// Glyphs are written by hand from an uninstalled package (see glyphs.ts), so these are
// the shapes that data can actually arrive in.

const glyph = (children: Glyph['children'], attribs?: Glyph['attribs']): Glyph => ({
	viewBox : '0 0 10 10',
	children,
	...(attribs ? { attribs } : {})
});

describe('icons/SvgIcon', () => {

	test('draws at the size it is given, in both directions', () => {
		const { container } = render(<SvgIcon size={24} icon={glyph([{ name : 'path', attribs : { d : 'M0 0h10' }}])} />);
		const svg = container.querySelector('svg');

		expect(svg).toHaveAttribute('width', '24');
		expect(svg).toHaveAttribute('height', '24');
	});

	// The wrappers pass '24' as a string as often as they pass 24, because width and
	// height take either one.
	test('takes a size given as a string', () => {
		const { container } = render(<SvgIcon size="24" icon={glyph([{ name : 'path', attribs : { d : 'M0 0h10' }}])} />);

		expect(container.querySelector('svg')).toHaveAttribute('width', '24');
	});

	// React has no `stroke-width` prop, and an unknown one is dropped: an outline glyph
	// would silently render hairline-thin.
	test('turns a hyphenated attribute into the prop React knows', () => {
		const { container } = render(
			<SvgIcon icon={glyph([{ name : 'path', attribs : { 'd' : 'M0 0h10', 'stroke-width' : '2' }}])} />
		);

		expect(container.querySelector('path')).toHaveAttribute('stroke-width', '2');
	});

	test('turns a style string into the declarations it names', () => {
		const { container } = render(
			<SvgIcon icon={glyph([{ name : 'path', attribs : { d : 'M0 0h10', style : 'fill-rule:evenodd;stroke-linecap:round' }}])} />
		);
		const path = container.querySelector<SVGPathElement>('path');

		expect(path?.style.fillRule).toBe('evenodd');
		expect(path?.style.strokeLinecap).toBe('round');
	});

	// A trailing semicolon is ordinary in pasted data, and splitting on it yields an
	// empty segment. Without the guard in `isNotUndefOrNull` that becomes an undefined key.
	test('survives a style string that ends in a separator', () => {
		const { container } = render(
			<SvgIcon icon={glyph([{ name : 'path', attribs : { d : 'M0 0h10', style : 'fill-rule:evenodd;' }}])} />
		);

		expect(container.querySelector<SVGPathElement>('path')?.style.fillRule).toBe('evenodd');
	});

	test('descends into a glyph whose nodes have nodes of their own', () => {
		const { container } = render(
			<SvgIcon icon={glyph([{
				name : 'g',
				attribs : { transform : 'translate(1 1)' },
				children : [{ name : 'circle', attribs : { cx : '5', cy : '5', r : '4' }}]
			}])} />
		);

		expect(container.querySelector('g circle')).toHaveAttribute('r', '4');
	});

	test('carries the glyph\'s own root attributes onto the svg', () => {
		const { container } = render(
			<SvgIcon icon={glyph([{ name : 'path', attribs : { d : 'M0 0h10' }}], { 'stroke-linejoin' : 'round' })} />
		);

		expect(container.querySelector('svg')).toHaveAttribute('stroke-linejoin', 'round');
	});

	test('renders a title only when one is given', () => {
		const one = glyph([{ name : 'path', attribs : { d : 'M0 0h10' }}]);

		expect(render(<SvgIcon icon={one} />).container.querySelector('title')).not.toBeInTheDocument();
		expect(render(<SvgIcon icon={one} title="A line" />).container.querySelector('title')).toHaveTextContent('A line');
	});

	// The whole point of the renderer: the svg takes `currentColor`, so whatever color a
	// wrapper was given reaches the glyph.
	test('leaves the fill to whatever encloses it', () => {
		const { container } = render(<SvgIcon icon={glyph([{ name : 'path', attribs : { d : 'M0 0h10' }}])} />);

		expect(container.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
	});

});

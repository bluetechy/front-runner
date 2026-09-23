import { render } from '@testing-library/react';
import { Icon } from '@/shared/icons/Icon';
import { twoHorizontal } from '@/shared/icons/glyphs';
import type { Glyph } from '@/shared/icons/glyphs';

// The ~140 wrapper tests assert color and size on the <svg>, which an EMPTY <svg> satisfies
// just as well. These cover the renderer itself: that the glyph's nodes actually become
// elements, and that the attribute rules the walker implements are applied.

describe('icons/Icon', () => {

	test('renders the glyph as SVG elements, not an empty svg', () => {
		const { container } = render(<Icon icon={twoHorizontal} />);

		const paths = container.querySelectorAll('path');
		expect(paths).toHaveLength(twoHorizontal.children.length);
		expect(paths[0]).toHaveAttribute('d', twoHorizontal.children[0]!.attribs.d);
	});

	test('carries the glyph viewBox onto the svg', () => {
		const { container } = render(<Icon icon={twoHorizontal} />);

		expect(container.querySelector('svg')).toHaveAttribute('viewBox', twoHorizontal.viewBox);
	});

	test('renders in the requested tag', () => {
		const { container } = render(<Icon icon={twoHorizontal} tag="span" />);

		expect(container.querySelector('span')).toBeInTheDocument();
		expect(container.querySelector('i')).not.toBeInTheDocument();
	});

	test('defaults to an <i> when no tag is given', () => {
		const { container } = render(<Icon icon={twoHorizontal} />);

		expect(container.querySelector('i')).toBeInTheDocument();
	});

	test('renders a title only when one is given', () => {
		const { container : without } = render(<Icon icon={twoHorizontal} />);
		expect(without.querySelector('title')).not.toBeInTheDocument();

		const { container : with_ } = render(<Icon icon={twoHorizontal} title="Two rows" />);
		expect(with_.querySelector('title')).toHaveTextContent('Two rows');
	});

	// The walker drops fill/stroke rather than passing them through, so the icon inherits
	// `currentColor` from the wrapper and a caller's `color` prop actually reaches the glyph.
	test('drops a glyph fill so the icon takes its color from the parent', () => {
		const filled: Glyph = {
			viewBox : '0 0 10 10',
			children : [{ name : 'path', attribs : { d : 'M0 0h10v10H0z', fill : '#FF0000' }}]
		};

		const { container } = render(<Icon icon={filled} />);

		expect(container.querySelector('path')).not.toHaveAttribute('fill');
		expect(container.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
	});

	// A node that is explicitly unfilled but stroked has to keep both, or it renders as a
	// solid block instead of an outline.
	test('keeps an explicit no-fill outline as a stroke', () => {
		const outlined: Glyph = {
			viewBox : '0 0 10 10',
			children : [{ name : 'path', attribs : { d : 'M0 0h10v10H0z', fill : 'none', stroke : '#000' }}]
		};

		const path = render(<Icon icon={outlined} />).container.querySelector('path');

		expect(path).toHaveAttribute('fill', 'none');
		expect(path).toHaveAttribute('stroke', 'currentColor');
	});

});

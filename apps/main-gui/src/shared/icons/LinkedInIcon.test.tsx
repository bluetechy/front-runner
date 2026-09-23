import { render } from '@testing-library/react';
import { LinkedInIcon } from './LinkedInIcon';

describe('icons/LinkedInIcon', () => {

	test('it renders without errors', () => {
		render(<LinkedInIcon />);
	});

	test('it renders with custom props', () => {
		const color = '#00FF00';
		const size = '24';

		const { container } = render(<LinkedInIcon color={color} size={size} />);
		const svgTag = container.querySelector<HTMLElement>('svg');

		expect(svgTag).toHaveStyle({ fill : color });
		expect(svgTag).toHaveAttribute('width', size);
		expect(svgTag).toHaveAttribute('height', size);
	});

	/* The color is a hex by default and the callers that want the enclosing
	 * color pass the keyword for it, so the keyword is checked too -- a
	 * wrapper that quietly dropped it would draw black on black.
	 *
	 * Read off the inline style rather than through `toHaveStyle`, which
	 * resolves a keyword against the computed color and would compare black
	 * with black. jsdom lowercases it on the way in. */
	test('it takes a keyword color as well as a hex one', () => {
		const { container } = render(<LinkedInIcon color="currentColor" />);
		const svgTag = container.querySelector<HTMLElement>('svg');

		expect(svgTag?.style.fill).toBe('currentcolor');
	});

});

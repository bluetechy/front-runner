import { render } from '@testing-library/react';
import { DashboardIcon } from './DashboardIcon';

describe('icons/DashboardIcon', () => {

	test('it renders without errors', () => {
		render(<DashboardIcon />);
	});

	test('it renders with custom props', () => {
		const color = '#00FF00';
		const size = 24;

		const { container } = render(<DashboardIcon color={color} size={size} />);
		const svgTag = container.querySelector<HTMLElement>('svg');

		/* MUI sizes by font-size, so that is where `size` lands. Colour and
		 * size pass just as happily against an empty <svg>, so the glyph
		 * itself is checked for too. */
		expect(svgTag).toHaveStyle({ fill : color, fontSize : `${size}px` });
		expect(svgTag?.querySelector('path')).toBeInTheDocument();
	});

	/* The colour is a hex by default and the callers that want the enclosing
	 * colour pass the keyword for it, so the keyword is checked too -- a
	 * wrapper that quietly dropped it would draw black on black.
	 *
	 * Read off the inline style rather than through `toHaveStyle`, which
	 * resolves a keyword against the computed colour and would compare black
	 * with black. jsdom lowercases it on the way in. */
	test('it takes a keyword colour as well as a hex one', () => {
		const { container } = render(<DashboardIcon color="currentColor" />);
		const svgTag = container.querySelector<HTMLElement>('svg');

		expect(svgTag?.style.fill).toBe('currentcolor');
	});

});

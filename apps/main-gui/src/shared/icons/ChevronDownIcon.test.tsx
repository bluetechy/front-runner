import { render } from '@testing-library/react';
import { ChevronDownIcon } from './ChevronDownIcon';

describe('icons/ChevronDownIcon', () => {

	test('it renders without errors', () => {
		render(<ChevronDownIcon />);
	});

	test('it renders with custom props', () => {
		const color = '#00FF00';
		const size = 24;

		const { container } = render(<ChevronDownIcon color={color} size={size} />);
		const svgTag = container.querySelector<HTMLElement>('svg');

		/* MUI sizes by font-size, so that is where `size` lands. Colour and
		 * size pass just as happily against an empty <svg>, so the glyph
		 * itself is checked for too. */
		expect(svgTag).toHaveStyle({ fill : color, fontSize : `${size}px` });
		expect(svgTag?.querySelector('path')).toBeInTheDocument();
	});

});

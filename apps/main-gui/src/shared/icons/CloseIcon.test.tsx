import React from 'react';
import { render } from '@testing-library/react';
import { CloseIcon } from './CloseIcon';

describe('icons/CloseIcon', () => {

	test('it renders without errors', () => {
		render(<CloseIcon />);
	});

	test('it renders with custom props', () => {
		const color = '#00FF00';
		const size = '24';

		const { container } = render(<CloseIcon color={color} size={size} />);
		const svgTag = container.querySelector<HTMLElement>('svg');

		expect(svgTag).toHaveStyle({ fill : color });
		expect(svgTag).toHaveAttribute('width', size);
		expect(svgTag).toHaveAttribute('height', size);
	});

});

import { render } from '@testing-library/react';
import { FlagIcon } from './FlagIcon';

describe('icons/FlagIcon', () => {

	test('it draws the flag file the code names, in lower case', () => {
		const { container } = render(<FlagIcon code="US" />);
		const img = container.querySelector<HTMLImageElement>('img');

		expect(img).toHaveAttribute('src', '/flags/us.svg');
	});

	test('it is round, and square whatever the file is', () => {
		const { container } = render(<FlagIcon code="mx" size={30} />);
		const img = container.querySelector<HTMLImageElement>('img');

		expect(img).toHaveStyle({ width : '30px', height : '30px' });
		expect(img).toHaveStyle({ borderRadius : '50%', objectFit : 'cover' });
	});

	/* A flag beside the name it stands for is decoration, and a screen reader
	 * announcing "United States United States" is worse than silence. */
	test('it is silent unless it is given something to say', () => {
		const { container } = render(<FlagIcon code="US" />);
		expect(container.querySelector('img')).toHaveAttribute('alt', '');

		const titled = render(<FlagIcon code="US" title="United States" />);
		expect(titled.container.querySelector('img')).toHaveAttribute('alt', 'United States');
	});

});

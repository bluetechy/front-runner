import { isNotUndefOrNull } from '@/shared/lib/common';

// The predicate is two characters of logic and one of them is load-bearing: `!= null`
// rather than a truthiness check. `@/shared/icons/SvgIcon` splits attribute strings on
// `:` and `;`, and `0` and `''` are both legitimate attribute values — a truthy test
// would throw those away and leave the glyph drawn wrong rather than not drawn at all.

describe('shared/lib/isNotUndefOrNull', () => {

	test.each([
		[ 'a string', 'fill' ],
		[ 'a number', 42 ],
		[ 'false', false ],
		[ 'an object', {} ]
	])('says %s is something', (_name, value) => {
		expect(isNotUndefOrNull(value)).toBe(true);
	});

	test.each([
		[ 'zero', 0 ],
		[ 'an empty string', '' ]
	])('says %s is something, because an attribute may be exactly that', (_name, value) => {
		expect(isNotUndefOrNull(value)).toBe(true);
	});

	test.each([
		[ 'undefined', undefined ],
		[ 'null', null ]
	])('says %s is nothing', (_name, value) => {
		expect(isNotUndefOrNull(value)).toBe(false);
	});

	// What it is actually for: it narrows, so the caller may use the value afterwards.
	test('narrows the type for whatever comes after it', () => {
		const values: (string | null)[] = [ 'fill', null, 'stroke' ];

		const kept: string[] = values.filter(isNotUndefOrNull);

		expect(kept).toEqual([ 'fill', 'stroke' ]);
	});

});

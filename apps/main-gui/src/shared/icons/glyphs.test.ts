import * as glyphs from '@/shared/icons/glyphs';

// The data is pasted in by hand from an uninstalled package, so the shape is the one thing no
// other test would catch: `Icon` reads `viewBox` and walks `children`, and a glyph missing
// either renders as an empty <svg> rather than throwing.
describe('shared/icons/glyphs', () => {

	const entries = Object.entries(glyphs);

	test('exports every glyph the wrappers import', () => {
		expect(entries).toHaveLength(23);
	});

	test.each(entries)('%s is a glyph Icon can render', (_name, glyph) => {
		expect(glyph.viewBox).toMatch(/^-?\d+(\.\d+)? -?\d+(\.\d+)? -?\d+(\.\d+)? -?\d+(\.\d+)?$/);
		expect(glyph.children.length).toBeGreaterThan(0);

		glyph.children.forEach(child => {
			expect(typeof child.name).toBe('string');
			expect(child.name).not.toHaveLength(0);
			expect(child.attribs).toBeInstanceOf(Object);
		});
	});
});

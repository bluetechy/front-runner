# Flags

`apps/main-gui/public/flags` holds every country's flag as an SVG, named by its lower-case two-letter ISO 3166
code (`us.svg`, `mx.svg`), plus the six-letter codes for the constituent
countries of Great Britain (`gb-eng.svg`).

From [hjnilsson/country-flags](https://github.com/hjnilsson/country-flags),
published to npm as `svg-country-flags`, which is where `ordercalc-gui` gets
its flags too — by way of `react-world-flags`, a wrapper we deliberately did
not take: its single pre-built bundle is 3.7 MB with every flag inlined, so a
page showing one flag pays for all 256, and it declares `svgo` as a runtime
dependency. The files are the useful part, so the files are what is here. The
source images are from Wikipedia and are not under copyright protection.

**All 256 are there on purpose, and only the ones a page names are ever
fetched.** Vite copies `public/` verbatim, so adding a language is a line in
`src/language/languages.ts` and nothing else — the flag it wants is already
served. Do not prune the folder to the languages currently offered; that
trade was made the other way round deliberately.

Nothing imports them directly. `@/shared/icons/FlagIcon` is what a page asks,
the same way it asks for any other icon.

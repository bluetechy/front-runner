# Icons

**Every icon in this app is a wrapper in `src/shared/icons`, and no other file
imports an icon library.** `@mui/icons-material`, `react-icons` and anything
that follows are implementation details of that folder. A page asks for
`SearchIcon`; it never learns where the glyph came from.

That is the whole point: swapping a library, or moving one icon between
libraries, is a change to one file in `src/shared/icons` and to nothing else.
A `grep` for `icons-material` outside that folder should return nothing.

## The contract

Every wrapper takes the same two props, from
[`IconProps.ts`](../../src/shared/icons/IconProps.ts):

```ts
interface IconProps {
  color?: string;
  size?: number | string;
}
```

`size` accepts a string because it reaches an SVG `width`/`height`, which takes
one. **`color` defaults to `#000000`** — every wrapper in the folder, no
exceptions — and the colour an icon is actually drawn in is set **where it is
used**, the way every other colour in this app is. An icon that should take the
colour of whatever encloses it is passed the keyword for that:

```tsx
<CloseIcon color="currentColor" size={20} />
```

which is most of the call sites, because the surface around an icon already
knows what it is written in. The keyword is a colour a caller passes, never the
default a wrapper assumes: a wrapper with no colour of its own is one that
draws differently depending on where it is dropped, and the contract is the
same everywhere or it is not a contract. Nothing else is part of it — no `sx`,
no `className`, no library-specific props — because anything more would leak
the library back out.

## Variant A — the library has the icon

The common case. One file per icon, named for the **role** it plays rather than
the glyph the library calls it: `CloseIcon` wraps `GoXCircle`.

```tsx
import React from "react";
import { GoXCircle } from "react-icons/go";
import type IconProps from "@/shared/icons/IconProps";

const CloseIconFactory: React.FC<IconProps> = ({
  color = "#000000",
  size = 16,
}) => {
  return <GoXCircle style={{ fill: color }} size={size} />;
};

export const CloseIcon: React.FC<IconProps> = CloseIconFactory;
export default CloseIcon;
```

Both a named and a default export, so either import style works at the call
site. The inner element is whatever the library wants — `react-icons` takes
`size` directly, MUI sizes by font-size because its `svg` is `1em` square, so
the MUI wrappers put `size` on `fontSize`:

```tsx
return <SearchRounded style={{ fill: color, fontSize: size }} />;
```

That difference is exactly the kind of thing this folder exists to absorb.

## Variant B — the library has no equivalent

Then the glyph becomes **data** rather than a component.
[`glyphs.ts`](../../src/shared/icons/glyphs.ts) holds parsed SVG — a `viewBox`
and a tree of `GlyphNode` — and [`Icon`](../../src/shared/icons/Icon.tsx) walks
it into elements through [`SvgIcon`](../../src/shared/icons/SvgIcon.tsx).

```tsx
<Icon icon={twoHorizontal} size={20} />
```

To add one:

1. Find the glyph in a set whose licence allows it and **copy the path data**.
   Never hand-retype it — a single wrong digit is invisible in review and
   obvious on screen.
2. Add it to `glyphs.ts` as a `Glyph`, with a comment naming the set it came
   from. The sets are independently licensed upstream, and a glyph with no
   recorded provenance cannot be re-checked later.
3. Bump the count in `glyphs.test.ts`, which asserts the total so a glyph
   cannot be added without being looked at.
4. If callers want it by name rather than by glyph, add a Variant A style
   wrapper around `Icon` beside the others.

`glyphs.ts` came from `react-icons-kit` (MIT), unmaintained since 2022, which
was a dependency for exactly these objects.

## What the walker does to attributes

`SvgIcon` is not a passthrough, and the two rules it applies are the reason
`color` works at all:

- **`fill` and `stroke` are dropped**, so the glyph inherits `currentColor`
  from the `svg` instead of carrying a baked-in colour.
- **Except** when a node is explicitly `fill="none"` with a `stroke` — that is
  an outline, and dropping the stroke would render it as a solid block. Those
  keep `fill: none` and take `stroke: currentColor`.

Attribute names are camel-cased and a `style` string is expanded into an
object, because React wants both.

## Variant C — the flag of a country

`FlagIcon` is the one wrapper that does not take `IconProps`, because a flag
is not one drawing:

```tsx
<FlagIcon code="US" size={22} />
```

There are 256 of them, served as files from `public/flags` (see
[flags](flags.md)), so the glyph cannot be an import and the prop that picks
it has to be the country. `code` is an ISO 3166 code in either case; `size` is a diameter,
because the flag is drawn round, cropped from a 4:3 file. There is no `color`
— a flag has its own.

Nothing outside this wrapper names a path under `public/flags`, for the same
reason nothing outside this folder names `react-icons`.

## Tests

**Every wrapper has a `<Name>.test.tsx` beside it** — one per icon, no
exceptions, the same three cases each:

1. it renders without errors;
2. it renders with custom props — the hex colour and the size reach the `svg`,
   and the glyph itself is there, because an assertion about colour and size
   passes just as happily against an **empty** `<svg>`;
3. it takes a keyword colour as well as a hex one, since `currentColor` is what
   most call sites pass and a wrapper that dropped it would draw black on
   black.

That third case reads the keyword off the **inline style** rather than through
`toHaveStyle`, which resolves `currentColor` against the element's computed
colour and would compare black with black. jsdom lowercases it on the way in,
so the assertion is against `currentcolor`.

`Icon.test.tsx` covers the renderer instead — that glyph nodes actually become
elements, and that the two attribute rules above hold.

Run them with `npm test --workspace main-gui`.

## Formatting

`src/shared/` is listed in `.prettierignore`. The folder is hand-authored in a
different house style — tabs, and spaces around the colon in object literals —
consistently throughout, and letting Prettier rewrite every line would bury the
next real diff. Match the surrounding style when adding to it. Removing that
entry and running `npm run format` is a one-line decision if the repository
style should win instead.

/* @no-test  An interface and nothing else: it is erased at compile time, so
 * there is no behavior here to assert. What it describes is asserted in
 * every wrapper's own test -- see docs/shared/icons.md and, for the practice
 * this marker belongs to, docs/testing.md. */

interface IconProps {
    color?: string;
    /* A string is allowed because it reaches an <svg> width/height, which
     * takes one; the tests pass '24' deliberately. */
    size?: number | string;
}

export type { IconProps as default };

interface IconProps {
    color?: string;
    /* A string is allowed because it reaches an <svg> width/height, which
     * takes one; the tests pass '24' deliberately. */
    size?: number | string;
}

export type { IconProps as default };

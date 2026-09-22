/**
 * Small predicates shared across `@/shared`.
 */

/**
 * Whether a value is something rather than nothing.
 *
 * `@/shared/icons/SvgIcon` splits attribute strings on `:` and `;`, which
 * yields `undefined` for a trailing separator or an empty segment. Guarding
 * both halves with this is what keeps `style="color:red;"` from producing an
 * `undefined` key, so the check has to stay `!= null` rather than truthiness:
 * `0` and `''` are legitimate attribute values.
 */
export const isNotUndefOrNull = <T,>(value: T | null | undefined): value is T =>
	value != null;

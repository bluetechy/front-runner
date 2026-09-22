/*
 * "2 days ago", in whatever language the interface is in.
 *
 * `Intl.RelativeTimeFormat` rather than a table of strings: every browser this
 * app runs in has it, it knows that Spanish says "hace 2 días" and that one
 * day is "yesterday" in both, and putting the phrasing in `locales/*.json`
 * would mean translating a grammar rather than a sentence.
 *
 * The unit is the largest one the gap fills, which is how a person says it: a
 * notification from ninety minutes ago is "1 hour ago", not "90 minutes ago".
 * Nothing is rounded up -- 23 hours is still hours, because "1 day ago" for
 * something that arrived this morning is wrong in the way somebody notices.
 */

/* Largest first: the first threshold the gap clears is the unit to say it in.
 * A month is 30 days and a year is 365, which is what a relative clock means
 * by them -- calendar arithmetic would change "a month ago" by a day or two
 * depending on the month, and nobody reads it that closely. */
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

export function relativeTime(
  when: string | Date,
  language: string,
  now: Date = new Date(),
): string {
  const moment = when instanceof Date ? when : new Date(when);
  /* A timestamp the API sent that this browser cannot parse is shown as
   * nothing rather than as "Invalid Date". */
  if (Number.isNaN(moment.getTime())) return "";

  const format = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  const seconds = Math.round((moment.getTime() - now.getTime()) / 1000);
  const magnitude = Math.abs(seconds);

  for (const [unit, size] of UNITS) {
    if (magnitude >= size) {
      /* Truncated towards zero rather than rounded, so 23 hours is "23 hours
       * ago" and not "1 day ago". */
      return format.format(Math.trunc(seconds / size), unit);
    }
  }

  /* Under a minute. "now" rather than "0 seconds ago", which is what
   * `numeric: "auto"` makes of it. */
  return format.format(0, "second");
}

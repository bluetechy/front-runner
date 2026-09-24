/*
 * When something happened, written out rather than counted back from.
 *
 * `notifications/relative-time.ts` says "2 days ago", which is right for a bell:
 * what matters there is how fresh a thing is. It is wrong here. Somebody
 * deciding whether a login was theirs is placing it against their own day --
 * "Sunday evening, when I was asleep" -- and "3 days ago" makes them do the
 * arithmetic that decides whether to report it.
 *
 * `Intl.DateTimeFormat` rather than a table of month names, for the reason the
 * relative clock uses `Intl.RelativeTimeFormat`: it already knows that Spanish
 * writes "20 sept 2026" and puts the hour in a 24-hour clock, and translating a
 * date format is translating a grammar rather than a sentence.
 */

export interface Occurred {
  /* "Sep 20, 2026" */
  day: string;
  /* "9:42 PM" */
  time: string;
}

export function occurredAt(when: string | Date, language: string): Occurred {
  const moment = when instanceof Date ? when : new Date(when);
  /* A timestamp the API sent that this browser cannot parse shows as nothing
   * rather than as "Invalid Date", which is the same answer the relative clock
   * gives. */
  if (Number.isNaN(moment.getTime())) return { day: "", time: "" };

  return {
    day: new Intl.DateTimeFormat(language, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(moment),
    time: new Intl.DateTimeFormat(language, {
      hour: "numeric",
      minute: "2-digit",
    }).format(moment),
  };
}

import { useCallback, useEffect, useState } from "react";
import { useSession } from "../authentication";
import { useApiCall } from "./api-call";

/*
 * The signed-in person's security log: logins, and the changes that alter how
 * they get into their account.
 *
 * A hook rather than a provider, for the reason `email-api.tsx` gives: nothing
 * outside this page wants this list. A `useEffect` and a `useState` rather than
 * TanStack Query, for the reason the rest of this vertical does it that way --
 * this is one read that nothing else invalidates, which is the case Query buys
 * the least in.
 *
 * It is one read because it asks for a window rather than a page: main-api
 * hands over the last thirty days and `activity-list.tsx` pages what comes
 * back, ten rows at a time, without asking again. That is the opposite of
 * the bell, which pages against the server through Query's infinite query, and
 * the difference is how much there is: a month of one account's logins is a
 * list, and a notification feed is not.
 *
 * Answering a question about an event replaces the **whole list**, the way
 * every write on this page does, and here it has to: saying "no, this was not
 * me" writes a second event recording that the alarm was raised, so the row
 * that was answered is not the only thing that moved.
 */

const EVENT_FIELDS = `SecurityEventUUID EventType Description Device Location
  OccurredAt ReviewedAt Recognized`;

const READ = `query SecurityEvents {
  securityEvents { ${EVENT_FIELDS} }
}`;

const REVIEW = `mutation ReviewSecurityEvent($securityEventId: String!, $recognized: Boolean!) {
  reviewSecurityEvent(securityEventId: $securityEventId, recognized: $recognized) { ${EVENT_FIELDS} }
}`;

/*
 * One thing that happened to the account.
 *
 * `ReviewedAt` and `Recognized` are the answer to "do you recognize this
 * activity?", and they are null together: unanswered is what the New mark is
 * drawn from. The database has a CHECK keeping them from disagreeing, so the
 * browser never has to decide which of them to believe.
 */
export interface SecurityEvent {
  SecurityEventUUID: string;
  /* "LoginSucceeded", "EmailAdded", and whatever the product comes to record.
   * `activity-kinds` turns it into a heading and has an answer for a type it
   * has not met. */
  EventType: string;
  /* The sentence the row shows, written where the event was recorded: it knows
   * which address or which device, and the type does not. */
  Description: string;
  /* What a login knows and an email change does not. Both are null on most
   * rows and the dialog leaves out whichever is missing rather than printing
   * "Unknown". */
  Device: string | null;
  Location: string | null;
  OccurredAt: string;
  ReviewedAt: string | null;
  Recognized: boolean | null;
}

export function useSecurityActivity() {
  const { status } = useSession();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  /* True until the first answer arrives, so the table waits rather than saying
   * nothing has ever happened to this account and correcting itself. */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const call = useApiCall("The API returned no security activity.");

  useEffect(() => {
    if (status !== "signed-in") return;
    let canceled = false;

    call<SecurityEvent[]>(READ, {})
      .then((loaded) => {
        if (!canceled) setEvents(loaded);
      })
      .catch((failure: unknown) => {
        if (!canceled)
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not reach the API.",
          );
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [status, call]);

  const review = useCallback(
    async (securityEventId: string, recognized: boolean) => {
      const list = await call<SecurityEvent[]>(REVIEW, {
        securityEventId,
        recognized,
      });
      setEvents(list);
      setError(null);
      return list;
    },
    [call],
  );

  return { events, loading, error, review };
}

import type { SecurityEvent } from "./activity-api";

/*
 * What one kind of security event is called, and what the question under it
 * says.
 *
 * `EventType` is free text in the database rather than an enum, because the
 * list of things worth recording about an account grows with the product --
 * the same reason `notification-kinds.ts` exists and has a fallback. A type
 * shipped by an API newer than this bundle gets its name spaced out rather
 * than an empty heading.
 *
 * The heading is short and the description under it is the sentence the API
 * wrote, so nothing here composes English out of a type: "New login" and
 * "New login on Mac OS." are the heading and the sentence, not two attempts at
 * the same one.
 *
 * `warning` is the only judgment in this file: whether an event, if it was not
 * you, means somebody else is in the account. A login and a changed password
 * do; an address added does too, because that is how an account is quietly
 * kept. A refused login is the exception that proves it: nobody got in, and it
 * still carries one, because somebody guessing at a password is the reason to
 * change it. The dialog asks the question either way -- it is the same question
 * -- but a quiet event does not need the sentence warning what it would mean.
 */

export interface ActivityKind {
  /* What the row and the dialog are headed. */
  heading: string;
  /* Said under the heading in the dialog, on the events where being wrong
   * about the answer is expensive. Empty on the rest. */
  warning: string;
}

const KINDS: Record<string, ActivityKind> = {
  LoginSucceeded: {
    heading: "New login",
    warning: "Your account is at risk if this was not you.",
  },
  /* The one kind nothing in this application caused: Keycloak refused a
   * password and main-api read it back out of the provider's event log. The
   * warning says the quiet part, because "failed" reads as nothing happened and
   * what happened is somebody guessing. */
  LoginFailed: {
    heading: "Failed login",
    warning:
      "Nobody got in. A password somebody else is guessing at is still worth changing.",
  },
  /* Quiet, and deliberately the only login-shaped row that is. Somebody else
   * ending your session is not how an account is taken: a logout locks a door
   * rather than opening one, and the dialog still asks the question. */
  LoggedOut: { heading: "Logged out", warning: "" },
  PasswordChanged: {
    heading: "Password changed",
    warning: "Your account is at risk if this was not you.",
  },
  EmailAdded: {
    heading: "Email address added",
    warning:
      "An email address you did not add is a way back into your account.",
  },
  EmailRemoved: { heading: "Email address removed", warning: "" },
  PrimaryEmailChanged: {
    heading: "Login email address changed",
    warning: "Your account is at risk if this was not you.",
  },
  ActivityReported: { heading: "You reported activity", warning: "" },
};

export function kindOf(eventType: string): ActivityKind {
  return KINDS[eventType] ?? { heading: spaced(eventType), warning: "" };
}

/* "PointsExpiring" becomes "Points expiring": untranslated and legible, and
 * better than an empty heading over a sentence. A type worth showing properly
 * gets a row in the table above. */
function spaced(eventType: string): string {
  const words = eventType.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/*
 * What the Status column says about an event, and which of the card's two pills
 * it says it in. There are three states and no fourth: nobody has answered,
 * somebody said it was them, or somebody said it was not.
 *
 * Reported keeps the waiting pill rather than earning a red of its own. The
 * word is the whole message -- nothing in this product is said in color alone
 * -- and a reported event genuinely is still outstanding: a link to choose a
 * new password is on its way and nobody has followed it yet.
 */
export function statusOf(event: SecurityEvent): {
  label: string;
  tone: "settled" | "waiting";
} {
  if (event.ReviewedAt === null) return { label: "New", tone: "waiting" };
  return event.Recognized
    ? { label: "Recognized", tone: "settled" }
    : { label: "Reported", tone: "waiting" };
}

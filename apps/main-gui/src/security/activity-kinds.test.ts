import { describe, expect, it } from "vitest";
import type { SecurityEvent } from "./activity-api";
import { kindOf, statusOf } from "./activity-kinds";

/*
 * What a kind of event is called, and what the Status column says about one.
 *
 * The type is free text in the database, because the list of things worth
 * recording grows with the product. So the thing worth pinning here is the
 * fallback: a type shipped by an API newer than this bundle has to draw
 * something legible rather than an empty heading.
 */

const event = (overrides: Partial<SecurityEvent> = {}): SecurityEvent => ({
  SecurityEventUUID: "2d000000-0000-4000-8000-000000000001",
  EventType: "LoginSucceeded",
  Description: "New login on Mac OS.",
  Device: "Mac OS",
  Location: "Utah, USA",
  OccurredAt: "2026-09-20T21:42:00.000Z",
  ReviewedAt: null,
  Recognized: null,
  ...overrides,
});

describe("what a kind of event is called", () => {
  it("heads a login as one", () => {
    expect(kindOf("LoginSucceeded").heading).toBe("New login");
  });

  /* The heading and the sentence are two different things rather than two
   * attempts at the same one: "New login" and "New login on Mac OS." */
  it("says what it would mean on the events where being wrong is expensive", () => {
    expect(kindOf("LoginSucceeded").warning).not.toBe("");
    expect(kindOf("PrimaryEmailChanged").warning).not.toBe("");
  });

  /* The one kind nothing in this application caused. "Failed" reads as nothing
   * happened, and what happened is somebody guessing at a password, so this is
   * the one warning that has to say so after saying nobody got in. */
  it("heads a refused login as one, and says nobody got in", () => {
    expect(kindOf("LoginFailed").heading).toBe("Failed login");
    expect(kindOf("LoginFailed").warning).toMatch(/nobody got in/i);
  });

  it("heads a finished session as a logout", () => {
    expect(kindOf("LoggedOut").heading).toBe("Logged out");
  });

  /* Connecting a provider is a way in that did not exist before, so it carries
   * the warning an added address carries: a way in somebody else put there is
   * how an account is quietly kept after a password is changed back.
   * Disconnecting one closes a door rather than opening one. */
  it("heads a connected provider as one, and warns about it", () => {
    expect(kindOf("SignInMethodConnected").heading).toBe(
      "Login provider connected",
    );
    expect(kindOf("SignInMethodConnected").warning).not.toBe("");
  });

  it("heads a disconnected provider as one, quietly", () => {
    expect(kindOf("SignInMethodDisconnected").heading).toBe(
      "Login provider disconnected",
    );
    expect(kindOf("SignInMethodDisconnected").warning).toBe("");
  });

  /* Louder than turning a second factor on, and the difference is what the
   * thing is: a second factor adds a step to getting in, and a passkey is a
   * whole way in that needs no password at all. */
  it("heads an added passkey as one, and warns that it needs no password", () => {
    expect(kindOf("PasskeyAdded").heading).toBe("Passkey added");
    expect(kindOf("PasskeyAdded").warning).toMatch(/without your password/i);
  });

  it("heads a removed passkey as one, quietly", () => {
    expect(kindOf("PasskeyRemoved").heading).toBe("Passkey removed");
    expect(kindOf("PasskeyRemoved").warning).toBe("");
  });

  /* A sentence about risk on every row is a sentence nobody reads by the
   * third one. A logout is the only login-shaped row that earns none: somebody
   * else ending your session locks a door rather than opening one. */
  it("says nothing extra about an event that is quiet", () => {
    expect(kindOf("EmailRemoved").warning).toBe("");
    expect(kindOf("ActivityReported").warning).toBe("");
    expect(kindOf("LoggedOut").warning).toBe("");
  });

  it("spaces out a type it has never met rather than drawing nothing", () => {
    expect(kindOf("SomethingNewHappened").heading).toBe(
      "Something new happened",
    );
    expect(kindOf("SomethingNewHappened").warning).toBe("");
  });
});

describe("what the Status column says", () => {
  /* Unanswered is what the New mark is drawn from, and it is the only thing
   * it is drawn from. */
  it("marks an unanswered event New", () => {
    expect(statusOf(event())).toEqual({ label: "New", tone: "waiting" });
  });

  it("marks one somebody claimed Recognized", () => {
    expect(
      statusOf(
        event({ ReviewedAt: "2026-09-21T00:00:00.000Z", Recognized: true }),
      ),
    ).toEqual({ label: "Recognized", tone: "settled" });
  });

  /* Reported keeps the waiting pill rather than earning a red of its own. The
   * word is the whole message, and a reported event genuinely is outstanding:
   * a link to choose a new password is on its way and nobody has followed it. */
  it("marks one somebody disowned Reported, and leaves it looking unfinished", () => {
    expect(
      statusOf(
        event({ ReviewedAt: "2026-09-21T00:00:00.000Z", Recognized: false }),
      ),
    ).toEqual({ label: "Reported", tone: "waiting" });
  });
});

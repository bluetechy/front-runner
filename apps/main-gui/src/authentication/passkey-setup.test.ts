import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Registering a passkey, which happens at the identity provider and nowhere
 * else.
 *
 * Three things are worth asserting, and they are the three
 * `second-factor-setup.test.ts` asserts, because this is the same trip. The
 * trip asks the provider to run its own registration action rather than only
 * logging somebody in. The marker is **taken** rather than read, so one left
 * behind cannot send the next ordinary login to the security page claiming a
 * passkey was just added. And a deployment that cannot ask for the action at
 * all says so, so the card draws no button instead of a button that goes
 * nowhere.
 */

const startRedirect = vi.fn(async () => undefined);

vi.mock("./identity-provider", () => ({ startRedirect }));

const {
  beginPasskeyRegistration,
  canRegisterPasskey,
  passkeyReturnPath,
  takePendingPasskey,
} = await import("./passkey-setup");

const PENDING_KEY = "front-runner.registering-passkey";

beforeEach(() => {
  startRedirect.mockClear();
  sessionStorage.clear();
  vi.stubEnv("VITE_IDP_ACTION_PARAMETER", "kc_action");
  vi.stubEnv("VITE_IDP_PASSKEY_ACTION", "webauthn-register-passwordless");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("whether this deployment can register one at all", () => {
  it("can, when it knows the parameter and the action", () => {
    expect(canRegisterPasskey()).toBe(true);
  });

  it("cannot, when the provider's action is not configured", () => {
    vi.stubEnv("VITE_IDP_PASSKEY_ACTION", "");

    expect(canRegisterPasskey()).toBe(false);
  });

  it("cannot, when there is no parameter to ask with", () => {
    vi.stubEnv("VITE_IDP_ACTION_PARAMETER", "");

    expect(canRegisterPasskey()).toBe(false);
  });
});

describe("starting the trip", () => {
  it("asks the provider to run its registration action on the way through", async () => {
    await beginPasskeyRegistration();

    expect(startRedirect).toHaveBeenCalledWith({
      kind: "login",
      action: "webauthn-register-passwordless",
    });
  });

  it("leaves a marker for the callback to find", async () => {
    await beginPasskeyRegistration();

    expect(sessionStorage.getItem(PENDING_KEY)).toBe("yes");
  });

  /* Refused rather than sent somewhere useless. A card that cannot offer the
   * button should never reach this, and this is what makes that true. */
  it("refuses when there is no action to ask for", async () => {
    vi.stubEnv("VITE_IDP_PASSKEY_ACTION", "");

    await expect(beginPasskeyRegistration()).rejects.toThrow(
      "cannot add a passkey",
    );
    expect(startRedirect).not.toHaveBeenCalled();
  });
});

describe("coming back", () => {
  it("says a trip was made", async () => {
    await beginPasskeyRegistration();

    expect(takePendingPasskey()).toBe(true);
  });

  /* Taken, not read: a marker left behind would send the next login to the
   * security page claiming a passkey had just been registered. */
  it("takes it, so the next login is unaffected", async () => {
    await beginPasskeyRegistration();
    takePendingPasskey();

    expect(takePendingPasskey()).toBe(false);
  });

  it("says nothing when no trip was started", () => {
    expect(takePendingPasskey()).toBe(false);
  });

  /* A hint about what to go and check, never a fact: the page hands it to
   * the API, which asks the provider. */
  it("comes back to the security page with the claim on the URL", () => {
    expect(passkeyReturnPath("success")).toBe(
      "/security-and-access?passkey=registered",
    );
  });

  /*
   * The other direction, and the reason this takes an argument at all.
   * Keycloak says `cancelled` when the browser's own dialog was dismissed and
   * `error` when the ceremony failed, and both mean the same thing to a
   * person: no passkey. Believing that needs no round trip, because the worst
   * a wrong `cancelled` can do is say nothing changed above a list that shows
   * otherwise -- unlike a wrong `registered`, which would have somebody walk
   * away believing they can login with their face.
   */
  it.each([["cancelled"], ["error"]])(
    "carries %s through as a trip that added nothing",
    (status) => {
      expect(passkeyReturnPath(status)).toBe(
        "/security-and-access?passkey=cancelled",
      );
    },
  );

  /* An older Keycloak, a proxy that ate the parameter, or a hand-typed URL.
   * The safe answer is the one that goes and asks. */
  it.each([[null], [""], ["something else"]])(
    "goes and asks when the provider said %p",
    (status) => {
      expect(passkeyReturnPath(status)).toBe(
        "/security-and-access?passkey=registered",
      );
    },
  );
});

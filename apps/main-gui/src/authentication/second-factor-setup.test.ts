import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Turning on an authenticator app, which happens at the identity provider and
 * nowhere else.
 *
 * Three things are worth asserting. The trip asks the provider to run its own
 * setup action rather than only signing somebody in. The marker is **taken**
 * rather than read, so a marker left behind cannot send the next ordinary
 * login to the security page claiming something was just configured. And a
 * deployment that cannot ask for the action at all says so, so the card draws
 * no button instead of a button that goes nowhere.
 */

const startRedirect = vi.fn(async () => undefined);

vi.mock("./identity-provider", () => ({ startRedirect }));

const {
  beginSecondFactorSetup,
  canConfigureSecondFactor,
  setupReturnPath,
  takePendingSecondFactor,
} = await import("./second-factor-setup");

const PENDING_KEY = "front-runner.configuring-factor";

beforeEach(() => {
  startRedirect.mockClear();
  sessionStorage.clear();
  vi.stubEnv("VITE_IDP_ACTION_PARAMETER", "kc_action");
  vi.stubEnv("VITE_IDP_TOTP_ACTION", "CONFIGURE_TOTP");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("whether this deployment can set one up at all", () => {
  it("can, when it knows the parameter and the action", () => {
    expect(canConfigureSecondFactor("authenticator-app")).toBe(true);
  });

  /* An empty action turns the Enable button off, the same way an empty link
   * path leaves the SSO card reading only. */
  it("cannot, when the provider's action is not configured", () => {
    vi.stubEnv("VITE_IDP_TOTP_ACTION", "");

    expect(canConfigureSecondFactor("authenticator-app")).toBe(false);
  });

  it("cannot, when there is no parameter to ask with", () => {
    vi.stubEnv("VITE_IDP_ACTION_PARAMETER", "");

    expect(canConfigureSecondFactor("authenticator-app")).toBe(false);
  });

  /* SMS answers true whatever is configured here, because none of it is about
   * SMS: a phone number is proved in a dialog on the security page, with no
   * browser sent anywhere. Whether there is anywhere to text is a different
   * question, answered by the row's own `Available`. */
  it("can, for SMS, whatever the provider's action settings say", () => {
    vi.stubEnv("VITE_IDP_TOTP_ACTION", "");
    vi.stubEnv("VITE_IDP_ACTION_PARAMETER", "");

    expect(canConfigureSecondFactor("sms")).toBe(true);
  });
});

describe("starting the trip", () => {
  it("asks the provider to run its setup action on the way through", async () => {
    await beginSecondFactorSetup("authenticator-app");

    expect(startRedirect).toHaveBeenCalledWith({
      kind: "login",
      action: "CONFIGURE_TOTP",
    });
  });

  it("leaves a marker for the callback to find", async () => {
    await beginSecondFactorSetup("authenticator-app");

    expect(sessionStorage.getItem(PENDING_KEY)).toBe("authenticator-app");
  });

  /* Refused rather than sent somewhere useless. A card that cannot offer the
   * button should never reach this, and this is what makes that true. */
  it("refuses a kind the provider cannot set up", async () => {
    await expect(beginSecondFactorSetup("sms")).rejects.toThrow(
      "cannot set that up",
    );
    expect(startRedirect).not.toHaveBeenCalled();
  });
});

describe("coming back", () => {
  it("answers the kind the trip was for", async () => {
    await beginSecondFactorSetup("authenticator-app");

    expect(takePendingSecondFactor()).toBe("authenticator-app");
  });

  /* Taken, not read: a marker left behind would send the next login to the
   * security page claiming something had just been set up. */
  it("takes it, so the next login is unaffected", async () => {
    await beginSecondFactorSetup("authenticator-app");
    takePendingSecondFactor();

    expect(takePendingSecondFactor()).toBeNull();
  });

  it("answers nothing when no trip was started", () => {
    expect(takePendingSecondFactor()).toBeNull();
  });

  it("comes back to the security page with the kind on the URL", () => {
    expect(setupReturnPath("authenticator-app")).toBe(
      "/security-and-access?configured=authenticator-app",
    );
  });

  it("escapes what it puts on the URL", () => {
    expect(setupReturnPath("a kind&more")).toBe(
      "/security-and-access?configured=a%20kind%26more",
    );
  });
});

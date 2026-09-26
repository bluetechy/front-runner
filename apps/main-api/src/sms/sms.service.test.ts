import { describe, expect, it, jest } from "@jest/globals";
import { Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

/*
 * The transport for text messages.
 *
 * Two things are worth asserting and the rest is Twilio's business. The first
 * is that a deployment with no credentials says so instead of failing on every
 * send: the SMS row on the security page is drawn off `available`, and a
 * service that claimed to work would put a second factor in front of people
 * that nobody can finish setting up. The second is the bargain MailService
 * makes -- a message that did not go is reported, not thrown, because the
 * caller is what knows whether that should refuse a login or draw a sentence
 * beside a box.
 */

const create = jest.fn<(message: unknown) => Promise<unknown>>();
const twilio = jest.fn((_sid?: string, _token?: string) => ({
  messages: { create },
}));

jest.unstable_mockModule("twilio", () => ({ default: twilio, twilio }));

const { SmsService } = await import("./sms.service.js");

const configured = {
  TWILIO_ACCOUNT_SID: "AC-account",
  TWILIO_AUTH_TOKEN: "a-token",
  TWILIO_FROM_NUMBER: "+15555550000",
};

/* The service says so when it cannot send, and says so again at construction
 * when it has no credentials -- correctly, and both of them would otherwise
 * print into the middle of a passing run. Caught on the prototype rather than
 * on the instance, because one of the two lines is written by the constructor
 * and there is no instance to reach yet. `logged` is also what one of the
 * tests below reads. */
const logged: string[] = [];

function setup(settings: Record<string, string> = configured) {
  // Installed here rather than once at the top of the file, because Jest is
  // configured to restore spies between tests.
  for (const level of ["error", "log", "warn"] as const)
    jest.spyOn(Logger.prototype, level).mockImplementation((line: unknown) => {
      logged.push(String(line));
    });
  create.mockReset().mockResolvedValue(undefined);
  twilio.mockClear();
  logged.length = 0;
  const config = {
    get: (key: string) => settings[key],
  } as unknown as ConfigService;
  return new SmsService(config);
}

describe("whether it can send at all", () => {
  it("is available when it has all three settings", () => {
    expect(setup().available).toBe(true);
  });

  it("is not available when nothing is configured", () => {
    expect(setup({}).available).toBe(false);
  });

  /* Two out of three is a deployment somebody started configuring, and
   * reading it as "ready" would be a card offering a factor that cannot be
   * finished. */
  it.each(Object.keys(configured))("is not available without %s", (missing) => {
    const partial = { ...configured, [missing]: "" };

    expect(setup(partial).available).toBe(false);
  });

  it("builds no client at all when it is not configured", () => {
    setup({});

    expect(twilio).not.toHaveBeenCalled();
  });
});

describe("sending one", () => {
  it("sends the text from the configured number", async () => {
    const service = setup();

    await expect(service.send("+15555550123", "a code")).resolves.toBe(true);

    expect(create).toHaveBeenCalledWith({
      to: "+15555550123",
      from: "+15555550000",
      body: "a code",
    });
  });

  /* Not thrown. The caller has something to do about it. */
  it("says a message did not go rather than throwing", async () => {
    const service = setup();
    create.mockRejectedValue(new Error("Twilio said no"));

    await expect(service.send("+15555550123", "a code")).resolves.toBe(false);
  });

  it("attempts nothing when it has nowhere to send from", async () => {
    const service = setup({});

    await expect(service.send("+15555550123", "a code")).resolves.toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  /* The number is the thing the message is about. A log line is a copy of it
   * somewhere nobody is watching. */
  it("keeps the number out of the log when a send fails", async () => {
    const service = setup();
    create.mockRejectedValue(new Error("Twilio said no"));

    await service.send("+15555550123", "a code");

    expect(logged.join("\n")).not.toContain("+15555550123");
    expect(logged.join("\n")).toContain("Twilio said no");
  });
});

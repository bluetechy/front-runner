import { describe, expect, it, jest } from "@jest/globals";
import { Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { SmsController } from "./sms.controller.js";
import type { SmsService } from "./sms.service.js";

/*
 * The one door into this API that Keycloak knocks on.
 *
 * It is not behind a token, so nearly everything worth asserting here is about
 * what it refuses. Three of those refusals are the reason the file exists:
 *
 * **No secret configured means no.** The safe direction is the feature not
 * working, which is a row on a page saying so. The other direction is a
 * text-message gateway open to whoever finds the port.
 *
 * **The body is a number and a code, never a message.** An endpoint that sent
 * whatever text it was handed would be an open relay the moment the secret
 * leaks, and the worst thing anybody can do to a person with a text message is
 * write it themselves.
 *
 * **A message that did not go is answered, not hidden.** The authenticator at
 * the other end has to fail the login rather than sit on a form waiting for
 * digits that are never arriving.
 */

const send = jest.fn<(to: string, text: string) => Promise<boolean>>();

const build = ({
  secret = "a-gateway-secret",
  available = true,
  product = "Front Runner",
}: { secret?: string; available?: boolean; product?: string } = {}) => {
  // One of the tests below builds a controller with no secret configured,
  // which warns -- correctly -- on every call it then refuses. Installed here
  // because Jest is configured to restore spies between tests.
  jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  send.mockReset().mockResolvedValue(true);
  const settings: Record<string, string> = {
    SMS_GATEWAY_SECRET: secret,
    MAIL_FROM_NAME: product,
  };
  return new SmsController(
    { available, send } as unknown as SmsService,
    { get: (key: string) => settings[key] } as unknown as ConfigService,
  );
};

const body = { phoneNumber: "+15555550123", code: "483920" };

describe("who is let in", () => {
  it("sends for a caller with the secret", async () => {
    const controller = build();

    await expect(
      controller.secondFactor("a-gateway-secret", body),
    ).resolves.toEqual({ sent: true });
    expect(send).toHaveBeenCalled();
  });

  it("refuses a caller with the wrong secret", async () => {
    const controller = build();

    await expect(
      controller.secondFactor("not-the-secret", body),
    ).rejects.toThrow("Refused");
    expect(send).not.toHaveBeenCalled();
  });

  /* A secret of a different length is still a wrong secret. The comparison
   * throws on mismatched lengths, so this is the case a naive one crashes on
   * rather than refuses. */
  it("refuses a secret of the wrong length", async () => {
    const controller = build();

    await expect(controller.secondFactor("short", body)).rejects.toThrow(
      "Refused",
    );
  });

  it("refuses a caller with no secret at all", async () => {
    const controller = build();

    await expect(controller.secondFactor(undefined, body)).rejects.toThrow(
      "Refused",
    );
  });

  /* Not an open door. An API with nothing configured refuses everybody. */
  it("refuses everything when no secret is configured", async () => {
    const controller = build({ secret: "" });

    await expect(controller.secondFactor("", body)).rejects.toThrow("Refused");
    await expect(controller.secondFactor("anything", body)).rejects.toThrow(
      "Refused",
    );
    expect(send).not.toHaveBeenCalled();
  });
});

describe("what it will carry", () => {
  it("writes the message itself rather than taking one", async () => {
    const controller = build();

    await controller.secondFactor("a-gateway-secret", {
      ...body,
      text: "Send your bank details to this address",
    } as Record<string, unknown>);

    expect(send).toHaveBeenCalledWith(
      "+15555550123",
      expect.stringContaining("is your login code"),
    );
    expect(send.mock.calls[0]?.[1]).not.toContain("bank details");
  });

  it("names the product the rest of this deployment is called", async () => {
    const controller = build({ product: "Northwind" });

    await controller.secondFactor("a-gateway-secret", body);

    expect(send.mock.calls[0]?.[1]?.startsWith("Northwind")).toBe(true);
  });

  it.each([
    ["not a number at all", { ...body, phoneNumber: "five five five" }],
    ["a number without a country code", { ...body, phoneNumber: "5555550123" }],
    ["no number", { code: "483920" }],
    ["a code with letters in it", { ...body, code: "48392a" }],
    ["a code far too long", { ...body, code: "4839201234" }],
    ["no code", { phoneNumber: "+15555550123" }],
  ])("refuses %s", async (_name, sent) => {
    const controller = build();

    await expect(
      controller.secondFactor("a-gateway-secret", sent),
    ).rejects.toThrow("Refused");
    expect(send).not.toHaveBeenCalled();
  });
});

describe("when there is nowhere to send", () => {
  it("says so rather than pretending the message went", async () => {
    const controller = build({ available: false });

    await expect(
      controller.secondFactor("a-gateway-secret", body),
    ).rejects.toThrow("Text messages are not available");
    expect(send).not.toHaveBeenCalled();
  });

  /* Answered rather than thrown: the authenticator refuses the login with
   * it. */
  it("answers that a message did not go", async () => {
    const controller = build();
    send.mockResolvedValue(false);

    await expect(
      controller.secondFactor("a-gateway-secret", body),
    ).resolves.toEqual({ sent: false });
  });
});

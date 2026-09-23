import { describe, expect, it, jest } from "@jest/globals";
import type { ConfigService } from "@nestjs/config";

/*
 * The transport. What is worth holding here is the bargain in its header: a
 * message that cannot be sent is reported rather than thrown, because the
 * caller has already written a row and losing that row because a mail server
 * hiccuped would be the worse outcome.
 *
 * nodemailer is mocked rather than reached. What this file is about is what
 * this service does with the answer, not whether SMTP works.
 */

const sendMail = jest.fn<(message: unknown) => Promise<unknown>>();
const createTransport = jest.fn((_options?: unknown) => ({ sendMail }));

jest.unstable_mockModule("nodemailer", () => ({
  createTransport,
  default: { createTransport },
}));

const { MailService } = await import("./mail.service.js");

const settings: Record<string, unknown> = {
  MAIL_ADDRESS: "main-mail",
  MAIL_SMTP_PORT: 1025,
  MAIL_FROM_ADDRESS: "no-reply@northwind.test",
  MAIL_FROM_NAME: "Front Runner",
};

const config = {
  getOrThrow: (key: string) => settings[key],
} as unknown as ConfigService;

const message = {
  to: "marcus@example.test",
  subject: "Confirm your email address",
  text: "a link",
  html: "<p>a link</p>",
};

/* The logger is silenced on every service these tests build. Two of them make
 * the transport fail on purpose, and the service logs that -- correctly -- so
 * without this the suite prints a line that reads like a real failure in the
 * middle of a passing run. `logged` is where those lines go instead, which is
 * also what lets one of the tests below assert on them. */
const logged: string[] = [];

function setup() {
  sendMail.mockReset().mockResolvedValue(undefined);
  createTransport.mockClear();
  logged.length = 0;
  const service = new MailService(config);
  jest
    .spyOn(
      (service as unknown as { logger: { error: (line: string) => void } })
        .logger,
      "error",
    )
    .mockImplementation((line) => {
      logged.push(String(line));
    });
  return service;
}

describe("how the transport is built", () => {
  it("points at the server the realm is pointed at", () => {
    setup();
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "main-mail", port: 1025 }),
    );
  });
});

describe("sending a message", () => {
  it("puts the configured sender on it and passes the rest through", async () => {
    const service = setup();
    await service.send(message);

    expect(sendMail).toHaveBeenCalledWith({
      from: '"Front Runner" <no-reply@northwind.test>',
      ...message,
    });
  });

  it("says so when the message went", async () => {
    const service = setup();
    await expect(service.send(message)).resolves.toBe(true);
  });

  // The bargain this service exists to make. The caller has a row on file
  // already, and a thrown error here would undo a mutation that succeeded.
  it("reports a failure rather than throwing it", async () => {
    const service = setup();
    sendMail.mockRejectedValue(new Error("connection refused"));

    await expect(service.send(message)).resolves.toBe(false);
  });

  // A log line about a failure is a copy of the address in a place nobody is
  // watching, and the address is the thing the message is about.
  it("keeps the address out of the log when it fails", async () => {
    const service = setup();
    sendMail.mockRejectedValue(new Error("connection refused"));

    await service.send(message);

    expect(logged.join(" ")).not.toContain("marcus@example.test");
    expect(logged.join(" ")).toContain("connection refused");
  });
});

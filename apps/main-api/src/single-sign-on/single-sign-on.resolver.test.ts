import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { PUBLIC_OPERATION, type Principal } from "../authentication/index.js";
import { SingleSignOnResolver } from "./single-sign-on.resolver.js";
import { SingleSignOnService } from "./single-sign-on.service.js";

/*
 * The one read and two writes behind the SSO card.
 *
 * None of them is @Public: the guard is global, so the absence of the marker
 * is the whole of what keeps a session in front of these. And the account
 * comes off the principal every time, never off an argument -- an operation
 * that took a login name would be a way to disconnect somebody else's Google.
 *
 * There is no connect operation, which is the shape of the feature rather than
 * an omission: connecting ends at the provider with a browser, so what this
 * API can do is confirm afterwards.
 */

const isPublic = (operation: keyof SingleSignOnResolver) =>
  Reflect.getMetadata(
    PUBLIC_OPERATION,
    SingleSignOnResolver.prototype[operation] as object,
  ) === true;

const principal: Principal = {
  userId: "b0000000-0000-4000-8000-000000000003",
  loginName: "marcus",
  sessionId: "session-now",
  device: "Mac OS",
};

const rows = [
  {
    Alias: "google",
    Name: "Google",
    Available: true,
    Connected: true,
    ConnectedAs: "marcus@gmail.test",
    CanDisconnect: true,
  },
];

function setup() {
  const service = {
    methods: jest.fn<(principal: Principal) => Promise<unknown>>(),
    disconnect:
      jest.fn<(principal: Principal, alias: string) => Promise<unknown>>(),
    confirm:
      jest.fn<(principal: Principal, alias: string) => Promise<unknown>>(),
  };
  service.methods.mockResolvedValue(rows);
  service.disconnect.mockResolvedValue(rows);
  service.confirm.mockResolvedValue(rows);
  return {
    service,
    resolver: new SingleSignOnResolver(
      service as unknown as SingleSignOnService,
    ),
  };
}

describe("who may reach these at all", () => {
  it("keeps a session in front of all three", () => {
    expect(isPublic("signInMethods")).toBe(false);
    expect(isPublic("disconnectSignInMethod")).toBe(false);
    expect(isPublic("confirmSignInMethod")).toBe(false);
  });
});

describe("reading the card", () => {
  it("answers about the account the session is for", async () => {
    const { resolver, service } = setup();

    await expect(resolver.signInMethods(principal)).resolves.toEqual(rows);
    expect(service.methods).toHaveBeenCalledWith(principal);
  });
});

describe("disconnecting one", () => {
  it("passes the provider through and the account off the session", async () => {
    const { resolver, service } = setup();

    await resolver.disconnectSignInMethod(principal, "google");

    expect(service.disconnect).toHaveBeenCalledWith(principal, "google");
  });
});

describe("confirming one", () => {
  it("passes the provider through as something to go and check", async () => {
    const { resolver, service } = setup();

    await resolver.confirmSignInMethod(principal, "google");

    expect(service.confirm).toHaveBeenCalledWith(principal, "google");
  });
});

describe("what a caller may name", () => {
  // The account is never one of them. Every operation here takes the principal
  // first and a provider alias at most, which is what stops any of this being
  // pointed at somebody else's account.
  it("takes no account, subject or user id as an argument", () => {
    const names = [
      resolver("signInMethods"),
      resolver("disconnectSignInMethod"),
      resolver("confirmSignInMethod"),
    ];
    expect(
      names.every((source) => !/loginName|subjectId|userId/.test(source)),
    ).toBe(true);
  });
});

function resolver(operation: keyof SingleSignOnResolver): string {
  return String(SingleSignOnResolver.prototype[operation]);
}

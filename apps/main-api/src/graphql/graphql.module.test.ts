import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { ConfigService } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApiGraphqlModule } from "./graphql.module.js";
import { queryLimits } from "./query-limits.js";

/*
 * How the schema is served. Most of this file is a security posture rather
 * than a preference -- introspection, batching, CSRF, what an error is
 * allowed to say -- so it is asserted rather than left to whoever edits the
 * options next.
 *
 * The options are built by a factory Nest calls with the configuration, so
 * the factory is found in the dynamic module's providers and called here the
 * way Nest would call it.
 */

interface AsyncProvider {
  useFactory?: (
    config: ConfigService,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
  inject?: unknown[];
}

/* Nest wraps the factory this module hands it, and the wrapper is async, so
 * the options are awaited rather than read straight back. */
async function optionsFor(environment: string) {
  const [dynamic] = (Reflect.getMetadata("imports", ApiGraphqlModule) ??
    []) as { module?: unknown; providers?: AsyncProvider[] }[];

  expect(dynamic?.module).toBe(GraphQLModule);

  const provider = (dynamic?.providers ?? []).find(
    (candidate) =>
      typeof candidate.useFactory === "function" &&
      candidate.inject?.includes(ConfigService),
  );
  if (!provider?.useFactory)
    throw new Error("the GraphQL options are no longer built by a factory");

  return provider.useFactory(new ConfigService({ NODE_ENV: environment }));
}

describe("where the schema is served", () => {
  it("serves one endpoint, built from the resolvers and sorted", async () => {
    const options = await optionsFor("development");

    expect(options.path).toBe("/graphql");
    expect(options.autoSchemaFile).toBe(true);
    expect(options.sortSchema).toBe(true);
  });

  // The guard reads the token off the request, so the request has to be in
  // the context every resolver is called with.
  it("puts the HTTP request in the context the guard reads", async () => {
    const context = (await optionsFor("development")).context as (argument: {
      req: unknown;
    }) => unknown;

    expect(context({ req: "the request" })).toEqual({ req: "the request" });
  });
});

describe("what the endpoint will not do", () => {
  it("answers introspection in development and refuses it in production", async () => {
    expect((await optionsFor("development")).introspection).toBe(true);
    expect((await optionsFor("production")).introspection).toBe(false);
  });

  // A playground is a page served from the API that runs queries against it.
  // There is one in the repository's tooling instead.
  it("serves no playground, in any environment", async () => {
    expect((await optionsFor("development")).playground).toBe(false);
  });

  // Batching turns one HTTP request into many operations, which is one
  // request past every per-request limit there is.
  it("refuses batched requests and requires the CSRF preflight", async () => {
    const options = await optionsFor("production");

    expect(options.allowBatchedHttpRequests).toBe(false);
    expect(options.csrfPrevention).toBe(true);
  });

  it("budgets every operation with our own depth and field limit", async () => {
    expect((await optionsFor("production")).validationRules).toEqual([
      queryLimits,
    ]);
  });
});

const formatError = async (error: Record<string, unknown>) =>
  (
    (await optionsFor("production")).formatError as (
      error: Record<string, unknown>,
    ) => Record<string, unknown>
  )(error);

describe("what an error is allowed to say", () => {
  it("never includes a stack trace", async () => {
    expect(
      (await optionsFor("production")).includeStacktraceInErrorResponses,
    ).toBe(false);
  });

  // Anything that reached here unrecognized came out of the database or out
  // of a bug, and either way its message is ours and not the caller's.
  it("replaces the message on an internal error", async () => {
    expect(
      await formatError({
        message: 'relation "dbo.Users" does not exist',
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      }),
    ).toMatchObject({ message: "Internal server error" });
  });

  it("keeps the message on an error the caller caused, and where it was", async () => {
    expect(
      await formatError({
        message: "limit must be 1–100 and offset 0–100000",
        locations: ["a location"],
        path: ["users"],
        extensions: { code: "BAD_USER_INPUT" },
      }),
    ).toEqual({
      message: "limit must be 1–100 and offset 0–100000",
      locations: ["a location"],
      path: ["users"],
      extensions: { code: "BAD_USER_INPUT" },
    });
  });

  // An error with no code is not an error we recognized.
  it("treats an uncoded error as an internal one", async () => {
    expect(
      await formatError({ message: "something", extensions: {} }),
    ).toMatchObject({ extensions: { code: "INTERNAL_SERVER_ERROR" } });
  });
});

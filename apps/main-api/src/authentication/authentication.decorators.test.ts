import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import type { ExecutionContext } from "@nestjs/common";
import {
  CurrentUser,
  Public,
  PUBLIC_OPERATION,
  type GraphqlContext,
} from "./authentication.decorators.js";

/*
 * The two decorators every resolver in this API is written against: the one
 * that says an operation needs no token, and the one that hands a resolver
 * the caller behind the token it did need.
 *
 * `CurrentUser` is a parameter decorator, and the only way to reach the
 * function inside one is the metadata Nest stores it under. The key is
 * Nest's own -- it is read here rather than imported because it is not part
 * of the package's public surface, and a change to it would be a change this
 * test should notice.
 */

const ROUTE_ARGUMENTS = "__routeArguments__";

/* Something for the decorators to be put on. A resolver, near enough. */
class Resolver {
  method(_user: unknown) {
    return "a result";
  }
}

function factoryOf(decorator: ParameterDecorator) {
  decorator(Resolver.prototype, "method", 0);
  const stored = Reflect.getMetadata(
    ROUTE_ARGUMENTS,
    Resolver,
    "method",
  ) as Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => unknown }
  >;
  const entry = Object.values(stored)[0];
  if (!entry) throw new Error("the decorator stored no factory");
  return entry.factory;
}

/* A resolver call as GraphQL makes one: root, arguments, context, info.
 * `GqlExecutionContext` is built from those four, and the context -- the
 * third of them -- is where the request, and so the principal, lives. */
const contextHolding = (graphql: GraphqlContext) =>
  ({
    getType: () => "graphql",
    getArgs: () => [undefined, {}, graphql, undefined],
    getClass: () => Resolver,
    getHandler: () => Resolver.prototype.method,
  }) as unknown as ExecutionContext;

describe("marking an operation public", () => {
  it("leaves a mark the guard can find on the class or the handler", () => {
    class Health {
      live() {
        return { status: "ok" };
      }
    }
    Public()(Health);

    expect(Reflect.getMetadata(PUBLIC_OPERATION, Health)).toBe(true);
  });

  // The absence of the mark is what makes every other operation private, so
  // the default has to be "not there" rather than "false".
  it("marks nothing it was not put on", () => {
    class Ordinary {
      profile() {
        return null;
      }
    }

    expect(Reflect.getMetadata(PUBLIC_OPERATION, Ordinary)).toBeUndefined();
  });
});

describe("handing a resolver the caller", () => {
  it("answers with the principal the guard put on the request", () => {
    const principal = { userId: "user-id", loginName: "alice" };
    const factory = factoryOf(CurrentUser());

    expect(
      factory(
        undefined,
        contextHolding({ req: { principal } } as GraphqlContext),
      ),
    ).toBe(principal);
  });
});

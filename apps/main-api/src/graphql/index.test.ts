import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as graphql from "./index.js";
import { ApiGraphqlModule } from "./graphql.module.js";
import {
  EmailPipe,
  NamePipe,
  PageArgs,
  PagePipe,
  ZodPipe,
} from "./validation.js";

/*
 * The module that stands the schema up, and the argument checks every
 * resolver in the API is written against. `queryLimits` is not here: it is
 * the module's own validation rule and nothing else should be installing it.
 */

describe("what the GraphQL layer offers the rest of the API", () => {
  it("offers the module, the page arguments, and the four pipes", () => {
    expect(Object.keys(graphql).toSorted()).toEqual([
      "ApiGraphqlModule",
      "EmailPipe",
      "NamePipe",
      "PageArgs",
      "PagePipe",
      "ZodPipe",
    ]);
  });

  it("offers the things themselves rather than copies of them", () => {
    expect(graphql.ApiGraphqlModule).toBe(ApiGraphqlModule);
    expect(graphql.PageArgs).toBe(PageArgs);
    expect(graphql.PagePipe).toBe(PagePipe);
    expect(graphql.NamePipe).toBe(NamePipe);
    expect(graphql.EmailPipe).toBe(EmailPipe);
    expect(graphql.ZodPipe).toBe(ZodPipe);
  });
});

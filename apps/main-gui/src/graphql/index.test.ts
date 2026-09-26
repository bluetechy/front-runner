import { describe, expect, it } from "vitest";
import * as graphql from "./index";
import { useGraphql } from "./graphql";

describe("what the graphql vertical offers the rest of the app", () => {
  it("offers the one call, and nothing else", () => {
    expect(Object.keys(graphql).toSorted()).toEqual(["useGraphql"]);
  });

  it("offers the hook itself rather than a copy of it", () => {
    expect(graphql.useGraphql).toBe(useGraphql);
  });
});

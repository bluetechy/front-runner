import { describe, expect, it } from "@jest/globals";
import {
  buildSchema,
  getIntrospectionQuery,
  parse,
  specifiedRules,
  validate,
} from "graphql";
import { queryLimits } from "./query-limits.js";
const schema = buildSchema(
  "type Query { node: Node } type Node { name: String next: Node }",
);
const errors = (document: string) =>
  validate(schema, parse(document), [...specifiedRules, queryLimits]);
describe("GraphQL query budget", () => {
  it("accepts ordinary operations and development introspection", () => {
    expect(errors("{ node { name } }")).toHaveLength(0);
    expect(errors(getIntrospectionQuery())).toHaveLength(0);
  });
  it("rejects deeply nested selections", () => {
    expect(
      errors("{ node {" + "next {".repeat(12) + "name" + "}".repeat(12) + "} }")
        .length,
    ).toBeGreaterThan(0);
  });
  it("counts fragment expansion under aliases", () => {
    const document =
      "{" +
      Array.from({ length: 60 }, (_, i) => `n${i}: node { ...Fields }`).join(
        " ",
      ) +
      "} fragment Fields on Node { name }";
    expect(
      errors(document).some((error) => error.message.includes("field limit")),
    ).toBe(true);
  });
  it("terminates on fragment cycles", () => {
    expect(
      errors("{ node { ...Loop } } fragment Loop on Node { ...Loop }").length,
    ).toBeGreaterThan(0);
  });
});

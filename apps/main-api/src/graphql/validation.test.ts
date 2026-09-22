import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import {
  EmailPipe,
  NamePipe,
  PageArgs,
  PagePipe,
  ZodPipe,
} from "./validation.js";

/*
 * The argument checks every resolver in this API is written against. They
 * run before any of them, which is what keeps "is this a sensible request?"
 * out of the services and out of the database.
 */

const page = (limit: number, offset: number) =>
  Object.assign(new PageArgs(), { limit, offset });

describe("the page every list is read in", () => {
  const pipe = new PagePipe();

  it("asks for fifty from the beginning when nobody said otherwise", () => {
    expect(new PageArgs()).toEqual({ limit: 50, offset: 0 });
  });

  it("passes a sensible page through unchanged", () => {
    expect(pipe.transform(page(25, 100))).toEqual({ limit: 25, offset: 100 });
  });

  it.each([
    ["a limit of nothing", 0, 0],
    ["a negative limit", -1, 0],
    ["a limit past the ceiling", 101, 0],
    ["a fractional limit", 1.5, 0],
    ["a negative offset", 50, -1],
    ["an offset past the ceiling", 50, 100001],
  ])("refuses %s", (_case, limit, offset) => {
    expect(() => pipe.transform(page(limit, offset))).toThrow(
      BadRequestException,
    );
  });

  // The ends are allowed. A ceiling that is off by one is a page somebody
  // cannot ask for and no error message explains.
  it.each([
    [1, 0],
    [100, 100000],
  ])("allows the edge case %i / %i", (limit, offset) => {
    expect(pipe.transform(page(limit, offset))).toEqual({ limit, offset });
  });
});

describe("a name", () => {
  const pipe = new NamePipe();

  it("trims what it is given, so the database is not asked to", () => {
    expect(pipe.transform("  Northwind  ")).toBe("Northwind");
  });

  it.each([
    ["nothing", ""],
    ["whitespace", "   "],
    ["more than the column holds", "N".repeat(65)],
  ])("refuses %s", (_case, value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });

  it("allows a name exactly as long as the column", () => {
    expect(pipe.transform("N".repeat(64))).toHaveLength(64);
  });
});

describe("an email address", () => {
  const pipe = new EmailPipe();

  // The database folds addresses to lower case, so an address that differs
  // only in case is the same address and should be written the same way once.
  it("trims it and folds it to lower case", () => {
    expect(pipe.transform("  Alice@Example.TEST ")).toBe("alice@example.test");
  });

  it.each([
    ["nothing", ""],
    ["no at sign", "alice.example.test"],
    ["no domain", "alice@"],
    ["no dot in the domain", "alice@example"],
    ["a space in it", "alice example@test.test"],
    ["more than the column holds", `${"a".repeat(250)}@example.test`],
  ])("refuses %s", (_case, value) => {
    expect(() => pipe.transform(value)).toThrow(
      "A valid email address is required",
    );
  });

  // Shape only. Whether anybody reads mail there is not a question a regular
  // expression can answer, and refusing an unusual address is worse than
  // accepting one that bounces.
  it("accepts an address that is unusual but real", () => {
    expect(pipe.transform("first+tag@sub.domain.example")).toBe(
      "first+tag@sub.domain.example",
    );
  });
});

describe("an argument checked against a schema", () => {
  const schema = z.object({
    name: z.string().trim().min(1),
    count: z.number().int(),
  });
  const pipe = new ZodPipe(schema);

  it("hands on what the schema parsed, not what arrived", () => {
    expect(pipe.transform({ name: "  Blue  ", count: 2 })).toEqual({
      name: "Blue",
      count: 2,
    });
  });

  // One round trip per mistake is a form nobody finishes, so every failing
  // field is named at once, each by the path it failed at.
  it("reports every field that failed, each by name", () => {
    try {
      pipe.transform({ name: "", count: 1.5 });
      throw new Error("the pipe accepted an invalid argument");
    } catch (failure) {
      expect(failure).toBeInstanceOf(BadRequestException);
      const message = (failure as BadRequestException).message;
      expect(message).toContain("name");
      expect(message).toContain("count");
    }
  });

  it("refuses something that is not an object at all", () => {
    expect(() => pipe.transform("not an object")).toThrow(BadRequestException);
  });
});

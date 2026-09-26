import { describe, expect, it } from "@jest/globals";
import { enrollmentCode, loginCode } from "./sms.copy.js";

/*
 * What the messages say.
 *
 * Copy is usually not worth a test. These two are, because the rules they keep
 * are security rules rather than style ones: a code with a second number
 * beside it is read wrong, a message with a link in it teaches people to
 * follow links in text messages, and a login code that does not say what to do
 * when you were not logging in is a warning nobody acts on.
 */

describe("both messages", () => {
  const both = [
    ["the enrollment code", enrollmentCode("Front Runner", "483920")],
    ["the login code", loginCode("Front Runner", "483920")],
  ] as const;

  it.each(both)("%s names the product first", (_name, text) => {
    expect(text.startsWith("Front Runner")).toBe(true);
  });

  it.each(both)("%s carries the code", (_name, text) => {
    expect(text).toContain("483920");
  });

  /* The only digits in the sentence. "Expires in ten minutes" is words for
   * exactly this reason. */
  it.each(both)("%s has no other number in it", (_name, text) => {
    expect(text.replace("483920", "")).not.toMatch(/\d/);
  });

  it.each(both)("%s contains no link", (_name, text) => {
    expect(text).not.toMatch(/https?:|www\.|\.com|\.test/);
  });

  it.each(both)("%s asks for nothing back", (_name, text) => {
    expect(text.toLowerCase()).not.toContain("reply");
  });
});

describe("what each one says", () => {
  it("says the enrollment code confirms a number, and that nobody will ask for it", () => {
    const text = enrollmentCode("Front Runner", "483920");

    expect(text).toContain("confirm this phone number");
    expect(text).toContain("never ask you for it");
  });

  /* This message arrives while somebody else is typing your password. It has
   * to say so plainly enough to act on. */
  it("tells somebody who was not logging in to change their password", () => {
    expect(loginCode("Front Runner", "483920")).toContain(
      "change your password",
    );
  });

  it("takes the product's name from the caller rather than hardcoding one", () => {
    expect(loginCode("Northwind", "483920").startsWith("Northwind")).toBe(true);
  });
});

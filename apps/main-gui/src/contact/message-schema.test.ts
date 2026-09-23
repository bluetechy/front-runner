import { describe, expect, it } from "vitest";
import { errorsOf, type Message } from "./message-schema";

/*
 * The only check a message gets. Nothing on the server looks at it -- see
 * `send-message.ts` -- so what this file lets through is what gets sent, and
 * what it stops is what somebody is asked to fix while they are still looking
 * at the form.
 *
 * The messages themselves are asserted rather than only the pass or fail:
 * a field that says "Invalid input" under it has told somebody nothing.
 */

const complete: Message = {
  firstName: "Marcus",
  lastName: "Member",
  email: "marcus@member.example",
  comments: "We run a reading program for 300 children. Does this fit?",
};

describe("a message worth sending", () => {
  it("passes when it has a name, an address and something to say", () => {
    expect(errorsOf(complete)).toEqual({});
  });

  // One name is a name. A form that refuses it is asking somebody to invent
  // a second one before it will talk to them.
  it("passes without a last name", () => {
    expect(errorsOf({ ...complete, lastName: "" })).toEqual({});
  });
});

describe("a message that is not worth sending yet", () => {
  it("asks for a name", () => {
    expect(errorsOf({ ...complete, firstName: "  " })).toEqual({
      firstName: "Tell us what to call you",
    });
  });

  it("asks for an address to reply to", () => {
    expect(errorsOf({ ...complete, email: "" })).toEqual({
      email: "Enter an address we can reply to",
    });
  });

  it("says the same thing about an address that is not one", () => {
    expect(errorsOf({ ...complete, email: "marcus@" })).toEqual({
      email: "Enter an address we can reply to",
    });
  });

  it("asks for something to say", () => {
    expect(errorsOf({ ...complete, comments: "" })).toEqual({
      comments: "Tell us what you are after",
    });
  });

  // Every field that is wrong is named at once: a form that reveals its
  // objections one at a time is a form somebody submits four times.
  it("names every field that is wrong, not the first of them", () => {
    expect(
      errorsOf({ firstName: "", lastName: "", email: "", comments: "" }),
    ).toEqual({
      firstName: "Tell us what to call you",
      email: "Enter an address we can reply to",
      comments: "Tell us what you are after",
    });
  });

  it("says how long is too long rather than only that it is", () => {
    expect(errorsOf({ ...complete, firstName: "M".repeat(65) })).toEqual({
      firstName: "First name cannot be longer than 64 characters",
    });
  });
});

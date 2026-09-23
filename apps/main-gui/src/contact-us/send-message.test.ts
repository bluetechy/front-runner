import { describe, expect, it } from "vitest";
import { sendMessage } from "./send-message";
import type { Message } from "./message-schema";

/*
 * The seam where a message will leave the browser, and today does not.
 *
 * There is one thing to assert about a function that sends nothing: that it
 * answers the way the form is written to expect, so the form is not the thing
 * that changes when a mailbox appears behind it. The day it does, this test
 * is where what it promises gets written down.
 */

const message: Message = {
  firstName: "Marcus",
  lastName: "Member",
  email: "marcus@member.example",
  comments: "We run a reading program for 300 children. Does this fit?",
};

describe("sending a message", () => {
  it("answers with a promise the form can wait on", async () => {
    await expect(sendMessage(message)).resolves.toBeUndefined();
  });
});

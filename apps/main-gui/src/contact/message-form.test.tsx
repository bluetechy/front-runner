import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * What the form does when it is submitted, and when it says so.
 *
 * The second half of that sentence is the point: nothing is announced until
 * the send has answered. A form that says "thank you" on the click has said
 * it about something that has not happened, and the send that fails is the
 * one it would be most wrong about -- so the send is stubbed here with a
 * promise this test resolves when it chooses to.
 *
 * A message that is not worth sending never reaches the send at all. Which
 * fields those are is `message-schema.test.ts`; what this asserts is that the
 * form stops at them, says so on the field, and says so once in the corner.
 */

const sendMessage = vi.fn();
const onNotice = vi.fn();

vi.mock("./send-message", () => ({
  sendMessage: (message: unknown) => sendMessage(message),
}));

const { MessageForm } = await import("./message-form");

const renderForm = () =>
  render(
    <ThemeProvider theme={theme}>
      <MessageForm onNotice={onNotice} />
    </ThemeProvider>,
  );

const field = (label: string) => screen.getByLabelText(label);
const send = () => screen.getByRole("button", { name: "Send message" });

function fillIn() {
  fireEvent.change(field("First name"), { target: { value: "Marcus" } });
  fireEvent.change(field("Last name"), { target: { value: "Member" } });
  fireEvent.change(field("Email"), {
    target: { value: "marcus@member.example" },
  });
  fireEvent.change(field("Message"), {
    target: { value: "We run a reading program for 300 children." },
  });
}

describe("sending a message", () => {
  beforeEach(() => {
    sendMessage.mockReset();
    onNotice.mockReset();
  });

  it("sends what was typed, and says so only once it has gone", async () => {
    let answer: () => void = () => undefined;
    sendMessage.mockReturnValue(
      new Promise<void>((resolve) => {
        answer = resolve;
      }),
    );
    renderForm();
    fillIn();

    fireEvent.click(send());
    await waitFor(() => expect(sendMessage).toHaveBeenCalled());
    /* In flight: the button says so, and nothing has been claimed yet. */
    expect(screen.getByRole("button", { name: /Sending/ })).toBeDisabled();
    expect(onNotice).not.toHaveBeenCalled();

    answer();

    await waitFor(() =>
      expect(onNotice).toHaveBeenCalledWith(
        "Thank you, your message is with us.",
        "success",
      ),
    );
    expect(sendMessage).toHaveBeenCalledWith({
      firstName: "Marcus",
      lastName: "Member",
      email: "marcus@member.example",
      comments: "We run a reading program for 300 children.",
    });
  });

  // A message that has gone is gone. Leaving it in the box invites the same
  // one being sent twice.
  it("empties the form once the message has gone", async () => {
    sendMessage.mockResolvedValue(undefined);
    renderForm();
    fillIn();

    fireEvent.click(send());

    await waitFor(() => expect(field("Message")).toHaveValue(""));
    expect(field("First name")).toHaveValue("");
    expect(field("Email")).toHaveValue("");
  });

  it("keeps the message, and says what happened, when the send fails", async () => {
    sendMessage.mockRejectedValue(new Error("no mailbox"));
    renderForm();
    fillIn();

    fireEvent.click(send());

    await waitFor(() =>
      expect(onNotice).toHaveBeenCalledWith(
        "That did not send. Please try again, or write to us directly.",
        "error",
      ),
    );
    expect(field("Message")).toHaveValue(
      "We run a reading program for 300 children.",
    );
    expect(send()).toBeEnabled();
  });
});

describe("a message that is not worth sending yet", () => {
  beforeEach(() => {
    sendMessage.mockReset();
    onNotice.mockReset();
  });

  it("sends nothing, and says what is wrong under the field it is wrong on", () => {
    renderForm();

    fireEvent.click(send());

    expect(sendMessage).not.toHaveBeenCalled();
    expect(screen.getByText("Tell us what to call you")).toBeInTheDocument();
    expect(
      screen.getByText("Enter an address we can reply to"),
    ).toBeInTheDocument();
    expect(screen.getByText("Tell us what you are after")).toBeInTheDocument();
    expect(onNotice).toHaveBeenCalledWith(
      "Some fields need another look. See the messages on them.",
      "error",
    );
  });

  // The complaint goes as soon as the field is touched: a message still
  // showing under a field somebody is mid-way through fixing is noise.
  it("stops complaining about a field the moment it is typed in", () => {
    renderForm();
    fireEvent.click(send());

    fireEvent.change(field("First name"), { target: { value: "M" } });

    expect(screen.queryByText("Tell us what to call you")).toBeNull();
    expect(
      screen.getByText("Enter an address we can reply to"),
    ).toBeInTheDocument();
  });
});

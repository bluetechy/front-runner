import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import type { StoredProfile } from "./profile-api";

/*
 * What the form says after "Update profile", and when it says it.
 *
 * The point of the second half of that sentence: nothing is announced until
 * the API has answered. A form that says "saved" on the click says it about a
 * save that has not happened yet, and the one that fails is the one it is
 * most wrong about.
 *
 * The date of birth is here too, because the form is where the two ways of
 * writing one meet: `1990-04-17` is what is stored and sent, `1990/04/17` is
 * what is on the screen, and nothing else in the app knows about the second.
 *
 * The API is stubbed rather than reached. `save` is handed back a promise
 * this test resolves when it chooses to, which is what lets it assert on the
 * moment in between. i18next is initialized by importing it, so `t()` answers
 * in the default language rather than with its keys.
 */

import "../language/i18n";

const save = vi.fn();
const onNotice = vi.fn();

vi.mock("../authentication", () => ({
  useSession: () => ({
    identity: { name: "Marcus Member", loginName: "member", email: "m@e.test" },
  }),
}));

vi.mock("./profile-api", () => ({
  useProfile: () => ({ profile: stored, loading: false, save }),
}));

const stored: StoredProfile = {
  UserUUID: "a0000000-0000-4000-8000-000000000001",
  FirstName: "Marcus",
  LastName: "Member",
  NickName: "",
  Designation: "",
  Biography: "",
  Gender: "Not specified",
  BirthDate: "1990-04-17",
  Phone: "",
  Address: "",
  Facebook: "",
  Github: "",
  LinkedIn: "",
  TikTok: "",
  Twitter: "",
  WantsAwardEmails: true,
  WantsDigestEmails: false,
};

const { ProfileForm } = await import("./profile-form");

function renderForm() {
  return render(
    <ThemeProvider theme={theme}>
      <ProfileForm onNotice={onNotice} />
    </ThemeProvider>,
  );
}

const birthDate = () => screen.getByLabelText("Date of birth");
const update = () => screen.getByRole("button", { name: "Update profile" });

describe("saving the profile", () => {
  beforeEach(() => {
    save.mockReset();
    onNotice.mockReset();
  });

  it("says nothing until the API has answered, and then says it saved", async () => {
    let answer: (profile: StoredProfile) => void = () => undefined;
    save.mockReturnValue(
      new Promise<StoredProfile>((resolve) => {
        answer = resolve;
      }),
    );
    renderForm();

    fireEvent.click(update());
    await waitFor(() => expect(save).toHaveBeenCalled());
    /* The save is in flight: the button says so, and the page has been told
     * nothing. */
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(onNotice).not.toHaveBeenCalled();

    answer(stored);
    await waitFor(() =>
      expect(onNotice).toHaveBeenCalledWith("Profile saved.", "success"),
    );
  });

  it("says what the API said when the API refuses", async () => {
    save.mockRejectedValue(new Error("Enter a phone number"));
    renderForm();

    fireEvent.click(update());
    await waitFor(() =>
      expect(onNotice).toHaveBeenCalledWith("Enter a phone number", "error"),
    );
  });

  it("does not reach the API when a field is wrong, and says so", async () => {
    renderForm();

    fireEvent.change(birthDate(), { target: { value: "1990.04.17" } });
    fireEvent.click(update());

    await waitFor(() =>
      expect(onNotice).toHaveBeenCalledWith(
        "Some fields need another look — see the messages on them.",
        "error",
      ),
    );
    expect(save).not.toHaveBeenCalled();
    /* The message names the format the field is showing, not the one the
     * schema is checking. */
    expect(
      screen.getByText("Write the date as YYYY/MM/DD"),
    ).toBeInTheDocument();
  });
});

describe("the date of birth", () => {
  beforeEach(() => {
    save.mockReset();
    onNotice.mockReset();
  });

  it("shows the stored date with slashes", () => {
    renderForm();

    expect(birthDate()).toHaveValue("1990/04/17");
  });

  it("stores what was typed with dashes", async () => {
    save.mockResolvedValue(stored);
    renderForm();

    fireEvent.change(birthDate(), { target: { value: "1990/04/18" } });
    fireEvent.click(update());

    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0]![0]).toMatchObject({ BirthDate: "1990-04-18" });
  });
});

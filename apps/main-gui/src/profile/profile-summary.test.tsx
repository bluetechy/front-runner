import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import "../language/i18n";
import type { StoredProfile } from "./profile-api";

/*
 * The left-hand column of the profile page: who this is, what they have
 * earned, where else they are, what they are good at, and how to reach them.
 *
 * The rule worth holding here is whose words are whose. What somebody typed
 * -- their name, their bio, the handles -- is never run through `t()`; only
 * what this card *says about them* is. Nor are the five link labels:
 * Facebook is Facebook in Spanish.
 */

const profile = vi.fn();
const onNotice = vi.fn();

vi.mock("../authentication", () => ({
  useSession: () => ({ identity: { name: "Marcus Member" } }),
}));

vi.mock("./profile-api", () => ({ useProfile: () => profile() }));

const { ProfileSummary } = await import("./profile-summary");

const stored = (overrides: Partial<StoredProfile> = {}): StoredProfile =>
  ({
    UserUUID: "a0000000-0000-4000-8000-000000000001",
    FirstName: "Marcus",
    LastName: "Member",
    NickName: "",
    Designation: "Program manager",
    Biography: "Runs the scoreboard.",
    Gender: "Not specified",
    BirthDate: "1990-04-17",
    Phone: "+1 555 0134",
    Address: "San Francisco, CA",
    Facebook: "",
    Github: "github.com/marcus",
    LinkedIn: "",
    TikTok: "",
    Twitter: "",
    WantsAwardEmails: true,
    WantsDigestEmails: false,
    ...overrides,
  }) as StoredProfile;

const renderSummary = (
  state: { profile: StoredProfile | null; loading?: boolean } = {
    profile: stored(),
  },
) => {
  profile.mockReturnValue({ loading: false, ...state });
  return render(
    <ThemeProvider theme={theme}>
      <ProfileSummary onNotice={onNotice} />
    </ThemeProvider>,
  );
};

beforeEach(() => {
  onNotice.mockClear();
});

describe("who this is", () => {
  it("shows the name from the session, and their face", () => {
    renderSummary();

    expect(
      screen.getByRole("heading", { name: "Marcus Member" }),
    ).toBeInTheDocument();
    expect(screen.getByText("MM")).toBeInTheDocument();
  });

  it("shows what they are here as", () => {
    renderSummary();

    expect(screen.getByText("Program manager")).toBeInTheDocument();
  });

  // Rather than an empty line where a title would be.
  it("says there is no designation when there is not", () => {
    renderSummary({ profile: stored({ Designation: "" }) });

    expect(screen.getByText("No designation yet")).toBeInTheDocument();
  });
});

describe("the bio", () => {
  it("shows what they wrote", () => {
    renderSummary();

    expect(screen.getByText(/Runs the scoreboard\./)).toBeInTheDocument();
  });

  it("points at the form when there is nothing there yet", () => {
    renderSummary({ profile: stored({ Biography: "" }) });

    expect(
      screen.getByText(/the form beside this is where it goes/),
    ).toBeInTheDocument();
  });

  // A card that grows to hold a thousand words pushes everything under it off
  // the screen, so a long one is folded until it is asked for.
  it("folds a long one away, and opens it when asked", () => {
    const long = "A sentence about the program. ".repeat(20);
    renderSummary({ profile: stored({ Biography: long }) });

    expect(screen.queryByText(long)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "More" }));

    expect(
      screen.getByText(new RegExp(long.slice(0, 200))),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Less" })).toBeVisible();
  });

  it("offers nothing to open on a short one", () => {
    renderSummary();

    expect(screen.queryByRole("button", { name: "More" })).toBeNull();
  });
});

describe("where else they are", () => {
  it("links the handles they saved", () => {
    renderSummary();

    const link = screen.getByRole("link", { name: "github.com/marcus" });
    expect(link).toHaveAttribute("href", "https://github.com/marcus");
    expect(link).toHaveAttribute("target", "_blank");
  });

  // Facebook is Facebook in Spanish, so these labels never go through t().
  it("names each network as the network is named", () => {
    renderSummary();

    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("says there are none rather than showing an empty list", () => {
    renderSummary({ profile: stored({ Github: "" }) });

    expect(screen.getByText("None saved")).toBeInTheDocument();
  });
});

describe("how to reach them", () => {
  it("shows the phone and the address they saved", () => {
    renderSummary();

    expect(screen.getByText("+1 555 0134")).toBeInTheDocument();
    expect(screen.getByText("San Francisco, CA")).toBeInTheDocument();
  });

  it("says a contact line is not set rather than leaving it blank", () => {
    renderSummary({ profile: stored({ Phone: "", Address: "" }) });

    expect(screen.getAllByText("Not set")).toHaveLength(2);
  });
});

describe("the picture", () => {
  // There is nowhere to keep one yet -- the token carries none -- so the
  // button says so rather than opening a file picker that leads nowhere.
  it("says there is nowhere to keep one yet", () => {
    renderSummary();

    fireEvent.click(screen.getByRole("button", { name: "Change picture" }));

    expect(onNotice).toHaveBeenCalledWith(
      expect.stringContaining("nowhere to keep a picture"),
    );
  });
});

describe("while the profile is still arriving", () => {
  it("stands in for the lines it does not have yet", () => {
    const { container } = renderSummary({ profile: null, loading: true });

    expect(
      container.querySelectorAll(".MuiSkeleton-root").length,
    ).toBeGreaterThan(0);
  });
});

describe("what is still placeholder", () => {
  it("shows the tallies and the skill bars", () => {
    renderSummary();

    expect(screen.getByText("Points")).toBeInTheDocument();
    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(
      within(screen.getByRole("heading", { name: "Social" })).queryByRole(
        "link",
      ),
    ).toBeNull();
  });
});

import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import "../language/i18n";
import { VersionList } from "./version-list";
import type { WidgetVersion } from "./widgets-api";

const version = (extra: Partial<WidgetVersion> = {}): WidgetVersion => ({
  Version: 1,
  SchemaVersion: "1.0",
  IsPublished: false,
  IsDraft: false,
  CreatedAt: "2026-01-01T00:00:00.000Z",
  CreatedBy: "member",
  ...extra,
});

function draw({
  versions = [version()],
  loading = false,
  error = null,
  openVersion = null,
  busyVersion = null,
  onOpen = vi.fn(),
  onPublish = vi.fn(),
}: Partial<Parameters<typeof VersionList>[0]> = {}) {
  const result = render(
    <ThemeProvider theme={theme}>
      <VersionList
        versions={versions}
        loading={loading}
        error={error}
        openVersion={openVersion}
        busyVersion={busyVersion}
        onOpen={onOpen}
        onPublish={onPublish}
      />
    </ThemeProvider>,
  );
  return { ...result, onOpen, onPublish };
}

const row = (label: string) =>
  within(screen.getByText(label).closest("li") as HTMLElement);

describe("what there is to go back to", () => {
  it("lists the versions it was given", () => {
    draw({ versions: [version({ Version: 2 }), version()] });
    expect(screen.getByText("Version 2")).toBeInTheDocument();
    expect(screen.getByText("Version 1")).toBeInTheDocument();
  });

  /*
   * The two marks come apart, which is why they are two. A widget nobody is
   * working on has them on one row; the moment somebody saves, the draft is one
   * row and what the world sees is another.
   */
  it("marks the live version and the latest save separately", () => {
    draw({
      versions: [
        version({ Version: 2, IsDraft: true }),
        version({ Version: 1, IsPublished: true }),
      ],
    });
    expect(row("Version 1").getByText("Live")).toBeInTheDocument();
    expect(row("Version 2").getByText("Latest save")).toBeInTheDocument();
  });

  /* Words rather than color alone: nothing in this product is said in color
   * alone. */
  it("says what each mark means in words", () => {
    draw({ versions: [version({ IsPublished: true, IsDraft: true })] });
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("Latest save")).toBeInTheDocument();
  });
});

describe("rolling back", () => {
  /*
   * There is no button called "roll back", and that is the design rather than
   * an omission: publishing version 1 while version 3 is live *is* the
   * rollback. One operation, one permission, nothing extra to learn.
   */
  it("is the publish button on an older row", () => {
    const { onPublish } = draw({
      versions: [
        version({ Version: 2, IsPublished: true, IsDraft: true }),
        version({ Version: 1 }),
      ],
    });

    fireEvent.click(row("Version 1").getByRole("button", { name: "Publish" }));
    expect(onPublish).toHaveBeenCalledWith(1);
  });

  /* Publishing what is already live would do nothing and look like it had done
   * something. */
  it("offers no publish on the version already being served", () => {
    draw({ versions: [version({ IsPublished: true })] });
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  /* Two publishes at once are two answers to what the world sees. */
  it("holds every row while one is publishing", () => {
    draw({
      versions: [version({ Version: 2 }), version({ Version: 1 })],
      busyVersion: 2,
    });
    expect(
      row("Version 2").getByRole("button", { name: "Publishing" }),
    ).toBeDisabled();
    expect(
      row("Version 1").getByRole("button", { name: "Publish" }),
    ).toBeDisabled();
  });

  /* What makes rolling back safe: the version can be read before it goes in
   * front of customers. */
  it("opens a version into the box first", () => {
    const { onOpen } = draw({ versions: [version({ Version: 3 })] });
    fireEvent.click(row("Version 3").getByRole("button", { name: "Open" }));
    expect(onOpen).toHaveBeenCalledWith(3);
  });

  it("says which version is already in the box", () => {
    draw({ versions: [version()], openVersion: 1 });
    expect(screen.getByRole("button", { name: "In the box" })).toBeDisabled();
  });
});

describe("before there is a history", () => {
  it("says what writes the first version", () => {
    draw({ versions: [] });
    expect(
      screen.getByText("No versions yet. Saving writes the first one."),
    ).toBeInTheDocument();
  });

  it("draws placeholders while the history is on its way", () => {
    const { container } = draw({ versions: [], loading: true });
    expect(
      container.querySelectorAll(".MuiSkeleton-root").length,
    ).toBeGreaterThan(0);
  });

  it("says so when the history could not be read", () => {
    draw({ versions: [], error: "Your session has expired. Login again." });
    expect(
      screen.getByText("Your session has expired. Login again."),
    ).toBeInTheDocument();
  });
});

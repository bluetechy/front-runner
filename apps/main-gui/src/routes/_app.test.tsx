import { ThemeProvider } from "@mui/material/styles";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * Everything behind the login. Pathless, so the URLs under it are what they
 * say: /dashboard, /profile, and the rest.
 *
 * Three things happen here and nowhere else, which is the point of the
 * layout: the session is guarded once rather than in each page, the profile
 * is fetched once for the rail and the profile page to share, and the chosen
 * language sits above both so that whatever comes to be translated can read
 * it.
 */

const navigate = vi.fn();
const session = vi.fn();

vi.mock("../authentication", () => ({ useSession: () => session() }));

vi.mock("../app-chrome", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

vi.mock("../language", () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="language">{children}</div>
  ),
}));

vi.mock("../profile", () => ({
  ProfileProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="profile">{children}</div>
  ),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Outlet: () => <p>The page</p>,
  useNavigate: () => navigate,
}));

const { Route } = await import("./_app");

const renderLayout = (status: string) => {
  session.mockReturnValue({ status });
  const Layout = Route.options.component!;
  return render(
    <ThemeProvider theme={theme}>
      <Layout />
    </ThemeProvider>,
  );
};

beforeEach(() => {
  navigate.mockReset();
});

describe("the layout behind the login", () => {
  it("puts every page under it inside the application's shell", () => {
    renderLayout("signed-in");

    expect(screen.getByTestId("app-shell")).toHaveTextContent("The page");
  });

  // The rail shows the designation under somebody's name and the profile
  // page shows the whole of it; fetching it twice would be two answers that
  // can disagree.
  it("holds the language and the profile above the whole application", () => {
    renderLayout("signed-in");

    const language = screen.getByTestId("language");
    expect(language).toContainElement(screen.getByTestId("profile"));
    expect(screen.getByTestId("profile")).toContainElement(
      screen.getByTestId("app-shell"),
    );
  });
});

describe("the guard", () => {
  // Signing out from the top bar, or arriving without a session at all.
  // Replaced rather than pushed, so Back does not return to a page that
  // would only bounce again.
  it("sends a signed-out visitor back to the landing page", async () => {
    renderLayout("signed-out");

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: "/", replace: true }),
    );
  });

  // The moment a remembered session is being restored. Bouncing here would
  // sign somebody out every time they opened the app with a token on disk.
  it("waits while a session is still being restored", () => {
    renderLayout("loading");

    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByText("The page")).toBeInTheDocument();
  });

  it("leaves a signed-in visitor where they are", () => {
    renderLayout("signed-in");

    expect(navigate).not.toHaveBeenCalled();
  });
});

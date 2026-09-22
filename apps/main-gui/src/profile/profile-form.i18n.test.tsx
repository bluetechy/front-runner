import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import i18n from "../language/i18n";
import { LanguageProvider } from "../language";

/*
 * The proof that the language switch reaches inside the chrome: the profile
 * form is the first page translated, and this is what says so.
 *
 * The two contexts the form reads are stubbed rather than built. This test
 * is about which words appear, not about fetching a profile -- the real
 * providers are covered where they live.
 */

vi.mock("../authentication", () => ({
  useSession: () => ({
    identity: { name: "Marcus Member", loginName: "member", email: "m@e.test" },
  }),
}));

vi.mock("./profile-api", () => ({
  useProfile: () => ({
    profile: null,
    loading: false,
    save: async () => undefined,
  }),
}));

const { ProfileForm } = await import("./profile-form");

/*
 * Rendered the way a visit does it: the language comes from storage and the
 * provider hands it to i18next. Calling `i18n.changeLanguage` directly would
 * not survive the first render -- the provider would put it back, which is
 * the provider being the one answer and is worth not working around.
 */
function renderIn(tag: string) {
  vi.stubGlobal("localStorage", {
    getItem: () => tag,
    setItem: () => undefined,
    removeItem: () => undefined,
  });

  return render(
    <ThemeProvider theme={theme}>
      <LanguageProvider>
        <ProfileForm onNotice={() => undefined} />
      </LanguageProvider>
    </ThemeProvider>,
  );
}

describe("the profile form in two languages", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en-US");
  });

  it("labels every section and field in English", () => {
    renderIn("en-US");

    for (const label of [
      "Personal information",
      "Date of birth",
      "Contact info",
      "Biographical info",
      "Update profile",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("labels them in Spanish once Spanish is chosen", () => {
    renderIn("es-MX");

    for (const label of [
      "Información personal",
      "Fecha de nacimiento",
      "Datos de contacto",
      "Información biográfica",
      "Actualizar perfil",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText("Personal information")).toBeNull();
  });

  /* The line this whole change is drawn along: "Male" is what the column
   * holds and what the schema checks, and "Hombre" is a label. Translating
   * the value would write a gender the check constraint refuses. */
  it("translates the gender shown without translating the gender stored", () => {
    const { container } = renderIn("es-MX");

    expect(screen.getByText("Sin especificar")).toBeInTheDocument();
    expect(container.innerHTML).toContain('value="Not specified"');
    expect(container.innerHTML).not.toContain('value="Sin especificar"');
  });

  /* A network is called a network in every language. */
  it("leaves the social networks' own names alone", () => {
    renderIn("es-MX");

    for (const name of [
      "Facebook",
      "GitHub",
      "LinkedIn",
      "TikTok",
      "Twitter",
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });
});

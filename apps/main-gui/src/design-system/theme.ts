import { createTheme } from "@mui/material/styles";

/*
 * The palette from the gamification mock-up: a deep violet field, lit from
 * behind the artwork, with magenta as the only accent. Everything visual in
 * this app comes from here — no component defines a colour of its own.
 */
const violet = {
  950: "#1f0538",
  900: "#2a0847",
  800: "#3a0d63",
} as const;

const accent = "#e34fc4";
const accentStrong = "#e0349f";
const accentDeep = "#8f3ce0";

const displayFont = '"Playfair Display", Georgia, "Times New Roman", serif';
const bodyFont =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/* Gutters and the content width, shared by the header and every page. */
const gutter = "clamp(1.25rem, 4vw, 3.5rem)";

/*
 * The sign-in dialog's surfaces. The supplied mock-up draws this card in
 * slate with a blue button; those are the only colours in it that do not
 * belong to this product, so the card is rebuilt here in the violet field's
 * own palette and the button takes the same magenta gradient as every other
 * contained button in the app.
 */
const panel = "#2c0a52";
const panelEdge = "rgba(227, 79, 196, 0.22)";
const inputField = "rgba(255, 255, 255, 0.07)";
const placeholder = "#9c86b6";

const brand = {
  /* The field every page is rendered on. */
  field: [
    `radial-gradient(120% 95% at 66% 42%, rgba(140, 45, 200, 0.55), transparent 62%)`,
    `radial-gradient(85% 65% at 100% 0%, rgba(200, 62, 214, 0.28), transparent 58%)`,
    `linear-gradient(158deg, ${violet[900]} 0%, ${violet[800]} 48%, ${violet[950]} 100%)`,
  ].join(", "),
  /* The light the artwork appears to cast on the field behind it. */
  glow: `radial-gradient(circle, rgba(180, 70, 240, 0.5), transparent 70%)`,
  buttonGradient: `linear-gradient(95deg, ${accentStrong}, ${accentDeep})`,
  navText: "#d7c6ec",
  /* A panel raised off the field: the sign-in dialog, and whatever follows. */
  panel,
  panelEdge,
  panelGlow: "0 30px 80px rgba(10, 2, 24, 0.7)",
  /* Inputs are a hollow of the panel rather than a surface of their own. */
  inputField,
  gutter,
} as const;

declare module "@mui/material/styles" {
  interface Palette {
    brand: typeof brand;
  }
  interface PaletteOptions {
    brand?: typeof brand;
  }
}

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: accentStrong, light: accent, dark: accentDeep },
    secondary: { main: accentDeep },
    background: { default: violet[950], paper: violet[800] },
    text: { primary: "#ffffff", secondary: "#bda7d6" },
    brand,
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: bodyFont,
    h1: {
      fontFamily: displayFont,
      fontWeight: 500,
      fontSize: "clamp(2.75rem, 6.2vw, 4.6rem)",
      lineHeight: 1.08,
      letterSpacing: "-0.015em",
    },
    h2: {
      fontFamily: displayFont,
      fontWeight: 500,
      fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
      lineHeight: 1.12,
      letterSpacing: "-0.015em",
    },
    body1: { fontSize: "0.95rem", lineHeight: 1.9 },
    /* The mock-up sets nav, buttons and the logo in the display serif. */
    button: {
      fontFamily: displayFont,
      fontStyle: "italic",
      fontSize: "0.95rem",
      textTransform: "none",
      /* Material tracks buttons wide; the mock-up sets them normally. */
      letterSpacing: "normal",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: "antialiased" },
      },
    },
    MuiContainer: {
      defaultProps: { maxWidth: "lg" },
      /* Wider gutters than Material's, to match the mock-up's proportions. */
      styleOverrides: {
        root: ({ theme: t }) => ({
          paddingLeft: gutter,
          paddingRight: gutter,
          [t.breakpoints.up("sm")]: {
            paddingLeft: gutter,
            paddingRight: gutter,
          },
        }),
      },
    },
    MuiAppBar: {
      defaultProps: { position: "static", elevation: 0, color: "transparent" },
      styleOverrides: {
        root: { backgroundImage: "none", paddingBlock: "1.6rem" },
      },
    },
    MuiToolbar: {
      defaultProps: { disableGutters: true },
      styleOverrides: { root: { minHeight: "auto" } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 999,
          padding: "0.72rem 1.7rem",
          whiteSpace: "nowrap",
          transition: "transform 150ms ease, box-shadow 150ms ease",
          "&:hover": { transform: "translateY(-1px)" },
        },
        contained: {
          backgroundImage: brand.buttonGradient,
          boxShadow: "0 12px 28px rgba(224, 52, 159, 0.32)",
          "&:hover": { boxShadow: "0 16px 34px rgba(224, 52, 159, 0.42)" },
        },
        outlined: {
          borderColor: "rgba(227, 79, 196, 0.65)",
          color: "#f2a9e6",
          "&:hover": {
            borderColor: accent,
            backgroundColor: "rgba(227, 79, 196, 0.12)",
          },
        },
        /* Used for the header's nav and sign-in links. */
        text: {
          padding: 0,
          minWidth: 0,
          color: brand.navText,
          "&:hover": {
            transform: "none",
            color: "#ffffff",
            backgroundColor: "transparent",
          },
        },
      },
    },
    /* Pill fields: a hollow in the panel rather than a box on top of it. */
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          backgroundColor: inputField,
          "& fieldset": { borderColor: "transparent" },
          "&:hover fieldset": { borderColor: panelEdge },
          "&.Mui-focused fieldset": { borderColor: accent, borderWidth: 1 },
        },
        input: {
          padding: "0.85rem 1.3rem",
          fontSize: "0.9rem",
          "&::placeholder": { color: placeholder, opacity: 1 },
        },
      },
    },
    MuiInputLabel: {
      /* The mock-up labels each field above it rather than inside it. */
      defaultProps: { shrink: true, disableAnimation: true },
      styleOverrides: {
        root: {
          position: "static",
          transform: "none",
          marginBottom: "0.5rem",
          fontSize: "0.85rem",
          fontWeight: 500,
          color: "#ffffff",
          "&.Mui-focused": { color: "#ffffff" },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: "none",
          backgroundColor: panel,
          border: `1px solid ${panelEdge}`,
          borderRadius: 20,
          boxShadow: "0 30px 80px rgba(10, 2, 24, 0.7)",
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { transition: "transform 150ms ease" },
      },
    },
  },
});

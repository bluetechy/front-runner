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

/*
 * The pricing cards are the one surface in the app that is not violet: white
 * paper laid on the field, with the field's own darkest violet drawn round it
 * as a border. Nothing in the dark palette can be reused inside them -- white
 * text on white is the obvious half, but "text.secondary" and the outlined
 * button's pink are just as unreadable there -- so a card carries its own ink,
 * its own muted ink, and its own hairline.
 */
const card = "#ffffff";
const cardInk = violet[950];
const cardInkMuted = "#6a5581";
const cardRule = "rgba(31, 5, 56, 0.12)";

/*
 * The chrome behind the login. The marketing pages are the field with a
 * transparent header laid over it; the application has two surfaces of its
 * own -- a rail down the left edge, which is the accent itself, and a bar
 * along the top, which is the card's paper stretched across the window.
 */
const rail = `linear-gradient(176deg, ${accent}, ${accentStrong})`;
const railInk = "rgba(255, 255, 255, 0.86)";
const railLabel = "rgba(255, 255, 255, 0.62)";
const railActive = "rgba(255, 255, 255, 0.2)";
const railEdge = "rgba(255, 255, 255, 0.28)";

/*
 * The teal the charts' third series is drawn in, which is also the pill the
 * rail marks the page you are on with. One constant rather than two, because
 * the second is meant to be the same colour as the first.
 *
 * White on it is 3.1:1, which is under what text needs, so the selected item
 * is written in the card's ink instead -- 5.9:1, and the same dark violet
 * everything else on white paper is written in.
 */
const teal = "#1f9fb5";

/*
 * Series colours for the dashboard's charts, drawn on card paper rather than
 * on the field. The first two are the accent pair every button is painted
 * with; the third is a teal chosen to stay separable from both for a
 * colour-blind reader -- the worst adjacent pair is 11.4 apart under
 * protanopia, against a floor of 8. They are assigned in this order and never
 * cycled: a fourth series is not a fourth hue, it is a different chart.
 */
const chartSeries = [accentStrong, accentDeep, teal] as const;

/*
 * A figure that moved the right way, and one that did not. Both are read on
 * card paper, so neither comes from the dark palette. They are constants
 * rather than literals in `brand` because the notification tints below reuse
 * them: a notification about money arriving is the same green as a figure
 * that went up.
 */
const rise = "#1f8a5f";
const fall = "#c2344d";

/*
 * The discs a notification's icon sits on in the bell's menu, named for what
 * the notification is about rather than for the colour: the vertical maps a
 * notification type onto one of these, so a type nobody has drawn an icon for
 * still lands somewhere deliberate.
 *
 * Every one of them carries a white glyph on card paper, so every one clears
 * 3:1 against white -- the floor for something that is drawn rather than
 * written. That is what the amber is: the mock-up's `#f5a623` is 2.0:1 and
 * unreadable, and this is the same hue taken down until it is 3.4:1.
 */
const amber = "#c77b14";

const noticeTints = {
  /* Work: a task assigned, a task past due. */
  task: accentDeep,
  /* Anything the programme awarded -- a badge, a level, points. */
  reward: accentStrong,
  /* Money moving: an order, a redemption. */
  commerce: rise,
  /* Something somebody wrote: a review, a mention. */
  message: amber,
  /* People arriving: registrations, an invitation, a welcome. */
  people: accent,
  /* Something that went wrong or needs an answer. */
  alert: fall,
  /* A type this app has not met. Deliberately the quietest of them. */
  general: cardInkMuted,
} as const;

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
  /* White paper on the field: the pricing cards, and whatever follows. */
  card,
  cardEdge: violet[950],
  cardInk,
  cardInkMuted,
  cardRule,
  /* The rail behind the login, and the ink on it. */
  rail,
  railInk,
  /* The heading over a group of nav items, quieter than the items. */
  railLabel,
  railActive,
  railEdge,
  /* The pill under the page you are on, and what it is written in. */
  railSelected: teal,
  railSelectedInk: cardInk,
  /* A hollow in card paper, the way `inputField` is one in the panel: the
   * top bar's search field, which on white would otherwise be white. */
  cardField: "rgba(31, 5, 56, 0.05)",
  /* The tint a stat tile's icon sits in. */
  cardTint: "rgba(227, 79, 196, 0.12)",
  rise,
  fall,
  chartSeries,
  /* The disc a notification's icon sits on, by what it is about. */
  noticeTints,
  /* Gridlines, and the unfilled part of a progress track. */
  chartGrid: "rgba(31, 5, 56, 0.1)",
  chartTrack: "rgba(31, 5, 56, 0.07)",
  /* The track a segmented control's selected pill slides along. */
  segmentTrack: "rgba(255, 255, 255, 0.06)",
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
    /*
     * Segmented controls: a pill track with the selected segment lit by the
     * same gradient as a contained button. The pricing page has two of them
     * -- who the plans are for, and how often you pay -- so the look belongs
     * here rather than in either one.
     */
    MuiToggleButtonGroup: {
      defaultProps: { exclusive: true },
      styleOverrides: {
        root: {
          gap: "0.25rem",
          padding: "0.3rem",
          borderRadius: 999,
          backgroundColor: brand.segmentTrack,
          border: `1px solid ${panelEdge}`,
        },
        grouped: {
          border: "none",
          borderRadius: "999px !important",
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          fontFamily: displayFont,
          fontStyle: "italic",
          fontSize: "0.9rem",
          textTransform: "none",
          letterSpacing: "normal",
          padding: "0.5rem 1.5rem",
          color: brand.navText,
          transition: "color 150ms ease, background-image 150ms ease",
          "&:hover": { color: "#ffffff", backgroundColor: "transparent" },
          "&.Mui-selected": {
            color: "#ffffff",
            backgroundColor: "transparent",
            backgroundImage: brand.buttonGradient,
            "&:hover": { backgroundImage: brand.buttonGradient },
          },
        },
      },
    },
  },
});

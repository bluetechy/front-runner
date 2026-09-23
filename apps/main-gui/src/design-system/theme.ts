import { createTheme } from "@mui/material/styles";

/*
 * The palette from the gamification mock-up: a deep violet field, lit from
 * behind the artwork, with magenta as the only accent. Everything visual in
 * this app comes from here — no component defines a color of its own.
 */
const violet = {
  950: "#1f0538",
  900: "#2a0847",
  800: "#3a0d63",
} as const;

const accent = "#e34fc4";
const accentStrong = "#e0349f";
const accentDeep = "#8f3ce0";

/*
 * The wordmark's own fade. It is a lighter pair than the button's, because a
 * logo is read rather than pressed and these are the two colors the supplied
 * mock-up sets it in: 6.5:1 and 5.7:1 on the black chrome, 5.3:1 and 4.7:1 on
 * the field behind the marketing header. The mark beside the word in the rail
 * takes the magenta end, so the glyph and the word are one lockup.
 */
const logoPink = "#f04fb6";
const logoViolet = "#c451ec";

const displayFont = '"Playfair Display", Georgia, "Times New Roman", serif';
const bodyFont =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/* Gutters and the content width, shared by the header and every page. */
const gutter = "clamp(1.25rem, 4vw, 3.5rem)";

/*
 * The sign-in dialog's surfaces. The supplied mock-up draws this card in
 * slate with a blue button; those are the only colors in it that do not
 * belong to this product, so the card is rebuilt here in the violet field's
 * own palette and the button takes the same magenta gradient as every other
 * contained button in the app.
 */
const panel = "#2c0a52";
const panelEdge = "rgba(227, 79, 196, 0.22)";
const inputField = "rgba(255, 255, 255, 0.07)";

/*
 * What an empty field says it takes. The mock-up's violet reads 4.3:1 on
 * that hollow, under the 4.5:1 a sentence needs; this is the same hue taken
 * up until it cleared, at 4.9:1.
 */
const placeholder = "#a68fc0";

/*
 * The edge around a text box.
 *
 * A box is drawn against its own fill rather than against the surface behind
 * it -- white held back around this dark hollow, the card's dark ink around
 * white paper -- so that a field reads as somewhere to write rather than as
 * a patch of a slightly different color. That is the whole rule, and it is
 * written out in docs/style-guide.md.
 *
 * White at 45% on the hollow is 4.0:1, against the 3:1 something drawn
 * rather than written needs, and the pointer takes it the rest of the way.
 */
const fieldEdge = "rgba(255, 255, 255, 0.45)";
const fieldEdgeHover = "#ffffff";

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
 * The edge around a text box cut into card paper: the card's muted ink at
 * 6.5:1, and the card's own ink at 18.5:1 under the pointer. `cardRule` is
 * 1.3:1 -- enough to divide a card into sections, nowhere near enough to
 * tell a white box from the white card it is cut into.
 */
const cardFieldEdge = cardInkMuted;
const cardFieldEdgeHover = cardInk;

/*
 * The one card on the page being pushed is the same paper with the accent
 * breathed onto it: the button's magenta at 9% over white. It takes no ink of
 * its own -- `cardInk` reads 16.3:1 on it against 18.5:1 on the white cards,
 * `cardInkMuted` 5.8:1 against 6.5:1, and the ticks down its feature list
 * 3.6:1 against 4.1:1 -- so a card changing paper changes nothing else.
 */
const cardFeatured = "#fcedf6";

/*
 * The chrome behind the login: a rail down the left edge and a bar across the
 * top. They were two surfaces of their own once -- the rail the accent itself,
 * the bar the card's paper stretched across the window -- then one surface in
 * the field's own violet, and they are black now: the chrome holds no color
 * at all, so the only lit thing in it is the page you are on.
 *
 * Both pieces are flat. The rail used to sink from the field's violet to the
 * darkest one as it fell, which was how it pulled below the field by the foot
 * of the window; there is nothing below black to sink to, so the fade is gone
 * and the two pieces are one color edge to edge.
 */
const black = "#000000";
const chrome = black;
const chromeRail = black;

/*
 * Everything written on the chrome is white -- 21:1 on black -- and the
 * quieter half of it is white held back rather than a gray of its own, at
 * 8.8:1. Both are far above the 4.5:1 text needs, and the number no longer
 * changes down the rail, because the surface under it no longer does.
 */
const chromeInk = "#ffffff";
const chromeLabel = "rgba(255, 255, 255, 0.66)";

/* The wash under the pointer, and the hairline along the chrome's outer
 * edges. The top bar's search field used to be a third of these, a hollow at
 * white 8%; it is card paper now, for the reason in `fieldEdge`. */
const chromeHover = "rgba(255, 255, 255, 0.09)";
const chromeEdge = "rgba(255, 255, 255, 0.16)";

/*
 * The pill under the page you are on: the same fade a contained button is
 * painted with, with its magenta end taken down one step. A nav item is
 * written at 0.92rem, which needs 4.5:1; the button's own `accentStrong`
 * gives white 4.1:1 there and this gives 4.8:1, against 5.4:1 at the violet
 * end the fade runs to. The pill itself is 4.4:1 against the black chrome at
 * its magenta end and 3.9:1 at its violet end, both above the 3:1 floor for
 * something drawn rather than written -- it reads brighter here than it did
 * on the violet, which is the point of taking the color out.
 */
const accentPill = "#d1258f";

/*
 * The accent taken down one step further again, for the word inside a status
 * pill. The pill is the accent laid on card paper at 12%, and `accentPill`
 * is 4.2:1 written on that tint where a 0.7rem word needs 4.5:1. This is the
 * same hue taken down until it cleared, at 4.8:1.
 */
const accentPillInk = "#c21f84";
const accentPillFade = `linear-gradient(95deg, ${accentPill}, ${accentDeep})`;
const chromeSelected = accentPillFade;

/*
 * The teal the charts' third series is drawn in, and the fade a person's face
 * is drawn on -- an avatar is the one circle in this app that is neither the
 * accent nor card paper, so nobody mistakes a face for a button.
 *
 * The initials inside that circle are white, and white on `teal` itself is
 * 3.1:1, which is under what text needs. So the fade is not drawn in it: it
 * runs between the same hue taken down to 4.7:1 and to 7.3:1, and the letters
 * clear the floor at both ends of it and everywhere between.
 */
const teal = "#1f9fb5";
const tealLit = "#0f7f93";
const tealDeep = "#0a5f72";

/*
 * Series colors for the dashboard's charts, drawn on card paper rather than
 * on the field. The first two are the accent pair every button is painted
 * with; the third is a teal chosen to stay separable from both for a
 * color-blind reader -- the worst adjacent pair is 11.4 apart under
 * protanopia, against a floor of 8. They are assigned in this order and never
 * cycled: a fourth series is not a fourth hue, it is a different chart.
 */
const chartSeries = [accentStrong, accentDeep, teal] as const;

/* A hue laid on card paper at 12%: the disc behind a stat tile's icon, and
 * the pill a status is written in. */
const cardTint = "rgba(227, 79, 196, 0.12)";
const cardTintTeal = "rgba(31, 159, 181, 0.12)";

/*
 * The pill a row wears to say what is known about it: teal for what is
 * settled, the accent's pink for what is still waiting on somebody. Teal is
 * not a second accent here, for the reason the teal toast is not one -- a
 * pill says what happened, it does not offer anything.
 *
 * Each is its own hue laid on white, with the word written in that hue taken
 * down until it cleared 4.5:1 on its own tint: `tealDeep` reads 6.4:1 and
 * `accentPillInk` 4.8:1. The word is the whole message. Nothing in this
 * product is said in color alone, so a pill is never the only place a row
 * says what it is.
 */
const statusPills = {
  settled: { ink: tealDeep, tint: cardTintTeal },
  waiting: { ink: accentPillInk, tint: cardTint },
} as const;

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
 * the notification is about rather than for the color: the vertical maps a
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
  /* Anything the program awarded -- a badge, a level, points. */
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
  /* The logo, wherever it is drawn: the word in the fade, the mark beside it
   * in the fade's magenta end. */
  logoGradient: `linear-gradient(92deg, ${logoPink}, ${logoViolet})`,
  logoMark: logoPink,
  navText: "#d7c6ec",
  /* A panel raised off the field: the sign-in dialog, and whatever follows. */
  panel,
  panelEdge,
  panelGlow: "0 30px 80px rgba(10, 2, 24, 0.7)",
  /* Inputs are a hollow of the panel rather than a surface of their own,
   * and the edge is what makes that hollow a box. */
  inputField,
  fieldEdge,
  fieldEdgeHover,
  /* White paper on the field: the pricing cards, and whatever follows. */
  card,
  cardEdge: violet[950],
  cardInk,
  cardInkMuted,
  cardRule,
  /* The same edge as `fieldEdge`, on the other kind of surface. */
  cardFieldEdge,
  cardFieldEdgeHover,
  /* The paper under the plan being pushed, and the badge beside its name. The
   * badge is painted in the nav pill's fade rather than the button's, for the
   * reason the nav pill is: it is small white text on the accent, and
   * `accentStrong` gives white 4.1:1 where 4.5:1 is needed, against 4.8:1 at
   * this fade's magenta end and 5.4:1 at its violet one. */
  cardFeatured,
  cardBadge: accentPillFade,
  cardBadgeInk: "#ffffff",
  /* The chrome behind the login: the bar across the top, and the rail down
   * the left edge. Two names for one black, because they are two pieces and
   * a repaint may not want them to stay one. */
  chrome,
  chromeRail,
  chromeInk,
  /* The heading over a group of nav items, the second line under somebody's
   * name, and anything else on the chrome that is not the first thing read. */
  chromeLabel,
  chromeHover,
  chromeEdge,
  /* The pill under the page you are on, and what it is written in. */
  chromeSelected,
  chromeSelectedInk: "#ffffff",
  /* The fade a face is drawn on. */
  avatarGradient: `linear-gradient(95deg, ${tealLit}, ${tealDeep})`,
  /*
   * The toast a page throws in the bottom corner when something it was asked
   * to do has finished: teal when it was done, pink when it was refused.
   *
   * Both are written in white, and both are a step deeper than the hue they
   * belong to, because a sentence needs 4.5:1: `teal` itself gives 3.1:1 and
   * `accentStrong` 4.1:1, against 4.7:1 and 4.8:1 here. The pink is not the
   * accent being spent -- a toast offers nothing, it says what happened.
   */
  toastSuccess: tealLit,
  toastFailure: accentPill,
  /* What this app writes on a surface painted in the accent -- the
   * notification panel's heading, and the control in it that has nothing
   * left to do. */
  onAccentWash: "rgba(255, 255, 255, 0.2)",
  onAccentLabel: "rgba(255, 255, 255, 0.62)",
  /* A hollow in card paper, the way `inputField` is one in the panel: a
   * read-only field, which on white would otherwise be white. */
  cardField: "rgba(31, 5, 56, 0.05)",
  /* The tint a stat tile's icon sits in. */
  cardTint,
  /* What a row wears to say what is known about it. */
  statusPills,
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
          "& fieldset": { borderColor: fieldEdge },
          "&:hover fieldset": { borderColor: fieldEdgeHover },
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

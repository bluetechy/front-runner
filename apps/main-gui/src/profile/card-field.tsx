import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

/*
 * A form field on card paper.
 *
 * The theme's own field is a pill hollowed out of the dark sign-in panel; on
 * white it is a white box on a white card with no edge to it. So a field here
 * takes the card's own edge for a border, the card's ink for text, and
 * square-ish corners, because a page of pills reads as a page of buttons. A
 * box is drawn against what is written in it -- see docs/style-guide.md.
 *
 * The label sits to the left of the control from `sm` up and above it below
 * that, which is the only thing the row does.
 */

export function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      sx={{
        alignItems: { sm: "flex-start" },
        gap: { xs: 0.75, sm: 2 },
        marginBottom: 2,
      }}
    >
      <Typography
        component="label"
        htmlFor={htmlFor}
        sx={{
          flexShrink: 0,
          width: { sm: "11rem" },
          paddingTop: { sm: "0.6rem" },
          fontSize: "0.88rem",
          color: (theme) => theme.palette.brand.cardInk,
        }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>{children}</Box>
    </Stack>
  );
}

export interface Option {
  value: string;
  label: string;
}

export function CardField({
  id,
  value,
  onChange,
  options,
  rows,
  type = "text",
  placeholder,
  error,
  hint,
  readOnly = false,
  loading = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /* Given, the field is a select of exactly these. */
  options?: readonly Option[];
  /* Given, the field takes newlines and is at least that many rows tall,
   * growing rather than hiding the end of a long answer behind a scrollbar. */
  rows?: number;
  /* No "date": the one date on this form is written the way this product
   * writes dates, and a native date field is written the way the browser's
   * locale does. See the form. */
  type?: "text" | "email" | "tel" | "url";
  /* Shown in an empty field: the shape of what goes in it, where the shape
   * is not obvious. It is not a label and never says what the field is. */
  placeholder?: string;
  /* What is wrong with what is in it, from the same rules the API applies. */
  error?: string;
  /* Said under the field when nothing is wrong: what it is for, or who owns
   * it. An error replaces it, because the error is the more urgent of the two. */
  hint?: string;
  /* Shown, but not this application's to change -- see the form. */
  readOnly?: boolean;
  /* The profile has not arrived yet; the field stands in for itself. */
  loading?: boolean;
}) {
  if (loading) return <Skeleton height={44} sx={{ transform: "none" }} />;

  return (
    <TextField
      id={id}
      fullWidth
      select={options !== undefined}
      multiline={rows !== undefined}
      minRows={rows}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={error !== undefined}
      helperText={error ?? hint}
      slotProps={{ input: { readOnly } }}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: "0.7rem",
          backgroundColor: (theme) =>
            readOnly ? theme.palette.brand.cardField : theme.palette.brand.card,
          color: (theme) =>
            readOnly
              ? theme.palette.brand.cardInkMuted
              : theme.palette.brand.cardInk,
          padding: rows === undefined ? 0 : "0.2rem 0.3rem",
          "& fieldset": {
            borderColor: (theme) => theme.palette.brand.cardFieldEdge,
          },
          /* Nothing deepens under the pointer on a field this application
           * cannot change: the hover is the invitation to type in it. */
          "&:hover fieldset": {
            borderColor: (theme) =>
              readOnly
                ? theme.palette.brand.cardFieldEdge
                : theme.palette.brand.cardFieldEdgeHover,
          },
          "&.Mui-focused fieldset": { borderColor: "primary.main" },
          "&.Mui-error fieldset": { borderColor: "error.main" },
        },
        "& .MuiInputBase-input": {
          padding: "0.72rem 0.9rem",
          fontSize: "0.9rem",
          /* The theme's placeholder is a violet for the dark panel's hollow;
           * on card paper it is 3.2:1, which is under what a sentence needs.
           * The card's own muted ink is 6.5:1. */
          "&::placeholder": {
            color: (theme) => theme.palette.brand.cardInkMuted,
            opacity: 1,
          },
        },
        "& .MuiFormHelperText-root": {
          marginLeft: "0.15rem",
          fontSize: "0.76rem",
          color: (theme) => theme.palette.brand.cardInkMuted,
          "&.Mui-error": { color: "error.main" },
        },
        /* The select's chevron is drawn by MUI and would otherwise be the
         * dark palette's white. */
        "& .MuiSelect-icon": {
          color: (theme) => theme.palette.brand.cardInkMuted,
        },
      }}
    >
      {options?.map((option) => (
        <MenuItem
          key={option.value}
          value={option.value}
          sx={{ fontSize: "0.9rem" }}
        >
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

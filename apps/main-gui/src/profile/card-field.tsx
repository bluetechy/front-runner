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
 * takes the card's rule for a border, the card's ink for text, and square-ish
 * corners, because a page of pills reads as a page of buttons.
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
  type?: "text" | "email" | "tel" | "url" | "date";
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
            borderColor: (theme) => theme.palette.brand.cardRule,
          },
          "&:hover fieldset": {
            borderColor: (theme) =>
              readOnly
                ? theme.palette.brand.cardRule
                : theme.palette.brand.cardInkMuted,
          },
          "&.Mui-focused fieldset": { borderColor: "primary.main" },
          "&.Mui-error fieldset": { borderColor: "error.main" },
        },
        "& .MuiInputBase-input": {
          padding: "0.72rem 0.9rem",
          fontSize: "0.9rem",
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

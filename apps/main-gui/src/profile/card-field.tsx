import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
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

export function CardField({
  id,
  value,
  onChange,
  options,
  rows,
  type = "text",
  required = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /* Given, the field is a select of exactly these. */
  options?: readonly string[];
  /* Given, the field takes newlines and is at least that many rows tall,
   * growing rather than hiding the end of a long answer behind a scrollbar. */
  rows?: number;
  type?: "text" | "email" | "tel" | "url";
  required?: boolean;
}) {
  return (
    <TextField
      id={id}
      fullWidth
      select={options !== undefined}
      multiline={rows !== undefined}
      minRows={rows}
      type={type}
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: "0.7rem",
          backgroundColor: (theme) => theme.palette.brand.card,
          color: (theme) => theme.palette.brand.cardInk,
          padding: rows === undefined ? 0 : "0.2rem 0.3rem",
          "& fieldset": {
            borderColor: (theme) => theme.palette.brand.cardRule,
          },
          "&:hover fieldset": {
            borderColor: (theme) => theme.palette.brand.cardInkMuted,
          },
          "&.Mui-focused fieldset": { borderColor: "primary.main" },
        },
        "& .MuiInputBase-input": {
          padding: "0.72rem 0.9rem",
          fontSize: "0.9rem",
        },
        /* The select's chevron is drawn by MUI and would otherwise be the
         * dark palette's white. */
        "& .MuiSelect-icon": {
          color: (theme) => theme.palette.brand.cardInkMuted,
        },
      }}
    >
      {options?.map((option) => (
        <MenuItem key={option} value={option} sx={{ fontSize: "0.9rem" }}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  );
}

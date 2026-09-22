import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloseIcon from "@/shared/icons/CloseIcon";
import { useId, type FormEvent, type ReactNode } from "react";

/*
 * The shell both "add" dialogs sit in, and the field they are both built from.
 *
 * The two supplied mock-ups are Google's payment sheets -- a white card with a
 * blue button -- so, exactly as the sign-in dialog did, what is taken from
 * them is the layout and what is not is the colour. A dialog here is the
 * violet panel the theme already draws, and a field in it is the pill hollowed
 * out of that panel. The alternative would be the app's only white surface
 * that is not a card.
 *
 * Both dialogs are forms: Enter submits, Escape closes, and neither does
 * anything while a save is in flight.
 */

export function MethodDialog({
  open,
  onClose,
  title,
  note,
  error,
  busy,
  submitLabel,
  onSubmit,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /* The line under the heading: what this will do, or what it will not. */
  note?: ReactNode;
  /* What the API said, when it refused something the form let through. */
  error?: string | null;
  busy: boolean;
  submitLabel: string;
  onSubmit: () => void;
  children: ReactNode;
}) {
  const titleId = useId();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!busy) onSubmit();
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      aria-labelledby={titleId}
      maxWidth="sm"
      fullWidth
    >
      <Box
        component="form"
        onSubmit={submit}
        noValidate
        sx={{
          position: "relative",
          p: { xs: "1.75rem 1.5rem", sm: "2rem 2.25rem" },
        }}
      >
        {/* Escape and the backdrop already close this; the button is the same
         * exit for anyone who reaches for neither. Held back while a save is
         * in flight, like everything else here. */}
        <IconButton
          aria-label="Close"
          onClick={onClose}
          disabled={busy}
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            color: "text.secondary",
            "&:hover": { color: "text.primary" },
          }}
        >
          <CloseIcon color="currentColor" size={20} />
        </IconButton>

        <Typography
          id={titleId}
          variant="h2"
          sx={{ fontSize: "1.5rem", fontWeight: 700, color: "primary.light" }}
        >
          {title}
        </Typography>
        {note ? (
          <Typography
            variant="body2"
            sx={{ mt: 0.75, color: "text.secondary", lineHeight: 1.6 }}
          >
            {note}
          </Typography>
        ) : null}

        {error ? (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}

        <Stack sx={{ mt: 2.5, gap: 2 }}>{children}</Stack>

        <Stack
          direction="row"
          sx={{ mt: 3, gap: 1.5, justifyContent: "flex-end" }}
        >
          <Button
            type="button"
            variant="text"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy}
            startIcon={
              busy ? <CircularProgress size={16} color="inherit" /> : undefined
            }
          >
            {busy ? "Saving…" : submitLabel}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}

/* One field on the panel. `options` turns it into a select of exactly those;
 * `hint` says what the field is for and an error replaces it, because the
 * error is the more urgent of the two. */
export function DialogField({
  label,
  value,
  onChange,
  error,
  hint,
  options,
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  options?: readonly string[];
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text";
  maxLength?: number;
}) {
  const id = useId();

  return (
    <FormControl fullWidth variant="outlined" error={error !== undefined}>
      <InputLabel htmlFor={id}>{label}</InputLabel>
      {options ? (
        <Select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      ) : (
        <OutlinedInput
          id={id}
          label={null}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          slotProps={{ input: { inputMode, maxLength } }}
        />
      )}
      {(error ?? hint) ? (
        <FormHelperText sx={{ ml: 0.5 }}>{error ?? hint}</FormHelperText>
      ) : null}
    </FormControl>
  );
}

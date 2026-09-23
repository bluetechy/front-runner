import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import { useId, useState, type FormEvent } from "react";
import { CardSurface } from "../card-surface";
import type { ToastTone } from "../toast";
import { errorsOf, type FieldErrors, type Message } from "./message-schema";
import { sendMessage } from "./send-message";

/*
 * The form at the bottom of the contact page: who you are, where to reply,
 * and what you wanted to say.
 *
 * It is white paper on the field -- the same `CardSurface` the dashboard and
 * the profile page are made of -- rather than a panel raised off it. Nothing
 * inside it can be drawn in the app's usual white-on-violet, then: the fields
 * carry the card's own ink, the card's rule for a border and the card's
 * square-ish corners, the way a field on the profile page does. The theme's
 * own field is a pill hollowed out of the dark sign-in panel, which on this
 * paper is a white box on a white card with no edge to it.
 *
 * Nothing is announced until `sendMessage` has answered, the same rule the
 * profile form keeps: a form that says "sent" on the click has said it about
 * something that has not happened. What `sendMessage` does today -- nothing
 * -- is its own file's business, and is written down there.
 */

/* The blank it starts from, and what it goes back to once a message has been
 * sent: a sent message is gone rather than still sitting in the box. */
const EMPTY: Message = {
  firstName: "",
  lastName: "",
  email: "",
  comments: "",
};

export function MessageForm({
  onNotice,
}: {
  onNotice: (message: string, tone?: ToastTone) => void;
}) {
  const [form, setForm] = useState<Message>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);

  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const commentsId = useId();

  function set(field: keyof Message, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    /* A field stops complaining as soon as it is touched; it is checked
     * again on submit. */
    setErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;

    const found = errorsOf(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      onNotice(
        "Some fields need another look. See the messages on them.",
        "error",
      );
      return;
    }

    setSending(true);
    try {
      await sendMessage(form);
      setForm(EMPTY);
      onNotice("Thank you, your message is with us.", "success");
    } catch {
      /* Today there is nothing to fail. There will be, and when there is,
       * the address at the top of this page is the one that still works. */
      onNotice(
        "That did not send. Please try again, or write to us directly.",
        "error",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <CardSurface
      sx={{ padding: { xs: "1.75rem 1.5rem", sm: "2.25rem 2.5rem" } }}
    >
      <Box component="form" onSubmit={submit} noValidate>
        <Grid container spacing={2.25}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Field
              id={firstNameId}
              label="First name"
              autoComplete="given-name"
              value={form.firstName}
              onChange={(value) => set("firstName", value)}
              error={errors.firstName}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Field
              id={lastNameId}
              label="Last name"
              autoComplete="family-name"
              value={form.lastName}
              onChange={(value) => set("lastName", value)}
              error={errors.lastName}
            />
          </Grid>
          <Grid size={12}>
            <Field
              id={emailId}
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="Where we should reply"
              value={form.email}
              onChange={(value) => set("email", value)}
              error={errors.email}
            />
          </Grid>
          <Grid size={12}>
            <Field
              id={commentsId}
              label="Message"
              rows={5}
              placeholder="What you are trying to get people to do, and where you are up to"
              value={form.comments}
              onChange={(value) => set("comments", value)}
              error={errors.comments}
            />
          </Grid>
        </Grid>

        <Button
          type="submit"
          variant="contained"
          disabled={sending}
          sx={{ mt: 3 }}
          startIcon={
            sending ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {sending ? "Sending…" : "Send message"}
        </Button>
      </Box>
    </CardSurface>
  );
}

/* One field of the form: the label above the control, the way the theme sets
 * every label, the control itself repainted for the card paper it is sitting
 * on, and what is wrong with it underneath. */
function Field({
  id,
  label,
  value,
  onChange,
  error,
  rows,
  type = "text",
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /* What is wrong with what is in it, from the same rules a send applies. */
  error?: string;
  /* Given, the field takes newlines and is at least that many rows tall. */
  rows?: number;
  type?: "text" | "email";
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <FormControl fullWidth variant="outlined" error={error !== undefined}>
      <InputLabel
        htmlFor={id}
        sx={{
          color: (theme) => theme.palette.brand.cardInk,
          "&.Mui-focused": { color: (theme) => theme.palette.brand.cardInk },
        }}
      >
        {label}
      </InputLabel>
      <OutlinedInput
        id={id}
        type={type}
        label={null}
        multiline={rows !== undefined}
        minRows={rows}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={error === undefined ? undefined : `${id}-error`}
        sx={{
          /* Square-ish corners rather than the theme's pill, the way a field
           * on the profile page's card is cut: a page of pills reads as a
           * page of buttons, and a pill could not have held the five lines
           * of the message box anyway. */
          borderRadius: "0.7rem",
          backgroundColor: (theme) => theme.palette.brand.card,
          color: (theme) => theme.palette.brand.cardInk,
          /* The card's own rule is 1.3:1 on its paper: enough to divide a
           * card into sections, not enough to tell a field from the card it
           * is cut into. So the outline is the card's muted ink, 6.5:1, and
           * the hover takes it the rest of the way to the card's ink. */
          "& fieldset": {
            borderColor: (theme) => theme.palette.brand.cardInkMuted,
          },
          "&:hover fieldset": {
            borderColor: (theme) => theme.palette.brand.cardInk,
          },
          "&.Mui-focused fieldset": { borderColor: "primary.main" },
          "&.Mui-error fieldset": { borderColor: "error.main" },
          /* The theme's placeholder is a violet for the dark panel's hollow,
           * and it is 3.2:1 on this paper. The card's own muted ink is 6.5:1. */
          "& .MuiInputBase-input::placeholder": {
            color: (theme) => theme.palette.brand.cardInkMuted,
            opacity: 1,
          },
          /* The theme pads the control itself, and MUI pads the root as well
           * once a field is multiline. Left as it was, the message would be
           * inset twice and start further in than the fields above it: the
           * padding belongs to the control, so the root gives its up. */
          ...(rows === undefined ? {} : { padding: 0 }),
        }}
      />
      {error === undefined ? null : (
        /* Material writes a helper line in `error.main`, which is 3.68:1 on
         * card paper and under what a 0.75rem sentence needs. `brand.fall` is
         * the red this app reads on white -- the figure that moved the wrong
         * way is drawn in it -- and it is 5.39:1 here. The outline around the
         * field keeps `error.main`: it is drawn rather than written, so its
         * floor is 3:1 and it clears that. */
        <FormHelperText
          id={`${id}-error`}
          sx={{ color: (theme) => theme.palette.brand.fall }}
        >
          {error}
        </FormHelperText>
      )}
    </FormControl>
  );
}

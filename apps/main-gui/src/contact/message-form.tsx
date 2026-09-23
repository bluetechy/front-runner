import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import { useId, useState, type FormEvent } from "react";
import type { ToastTone } from "../toast";
import { errorsOf, type FieldErrors, type Message } from "./message-schema";
import { sendMessage } from "./send-message";

/*
 * The form at the bottom of the contact page: who you are, where to reply,
 * and what you wanted to say.
 *
 * It is a panel raised off the field rather than white paper, so the fields
 * inside it are the theme's own -- the hollow the sign-in dialog's are cut
 * out of -- and it needs no colors of its own. The one thing it overrides is
 * the corner of the message box: the theme rounds an input to a pill, and a
 * pill cannot hold five lines of prose without the first and last of them
 * running into the curve.
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
    <Box
      component="form"
      onSubmit={submit}
      noValidate
      sx={{
        padding: { xs: "1.75rem 1.5rem", sm: "2.25rem 2.5rem" },
        borderRadius: "1.75rem",
        backgroundColor: (theme) => theme.palette.brand.panel,
        border: (theme) => `1px solid ${theme.palette.brand.panelEdge}`,
        boxShadow: (theme) => theme.palette.brand.panelGlow,
      }}
    >
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
  );
}

/* One field of the form: the label above the control, the way the theme sets
 * every label, and what is wrong with it underneath. */
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
      <InputLabel htmlFor={id}>{label}</InputLabel>
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
        sx={
          rows === undefined
            ? undefined
            : {
                /* A pill cannot hold five lines: the first and the last of
                 * them would run into the curve. */
                borderRadius: "1.25rem",
                padding: "0.85rem 1.3rem",
              }
        }
      />
      {error === undefined ? null : (
        /* Material writes a helper line in `error.main`, which is 4.48:1 on
         * the panel and just under what a 0.75rem sentence needs. The lighter
         * end of the same red is 5.53:1 and still unmistakably a complaint.
         * The outline around the field keeps `error.main`: it is drawn rather
         * than written, so its floor is 3:1. */
        <FormHelperText id={`${id}-error`} sx={{ color: "error.light" }}>
          {error}
        </FormHelperText>
      )}
    </FormControl>
  );
}

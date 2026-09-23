import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import CloseIcon from "@/shared/icons/CloseIcon";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { categories } from "./categories";
import { everything, nothingOptional, type Choices } from "./consent";
import { useCookieConsent } from "./cookie-consent";

/*
 * The fine-grained half of the box: one switch per category, with what the
 * category is for and what is actually kept under it written beside it.
 *
 * It is a panel raised off the field, the same surface as the sign-in dialog,
 * because that is what a dialog is in this product -- see docs/style-guide.md.
 *
 * Three things here are requirements rather than taste:
 *
 * - **Every optional category starts off.** A dialog whose switches are
 *   already on is asking somebody to opt out, and a pre-ticked box has never
 *   been consent under the GDPR. What is on when this opens is what was
 *   chosen last time, and nothing at all the first time.
 * - **Each category can be answered on its own.** Allowing analytics while
 *   refusing marketing has to be possible, or the choice is not specific.
 * - **"Reject all" and "Accept all" are the same button twice.** Same
 *   variant, same size, same row, one press each. Only "Save my choices",
 *   which is neither of those, takes the accent.
 *
 * Closing this without pressing anything records nothing, on purpose: the
 * notice is still there underneath, and no answer is still no answer.
 */

export function CookiePreferences() {
  const { editing, closeEditor } = useCookieConsent();
  const titleId = useId();
  const introId = useId();

  return (
    <Dialog
      open={editing}
      onClose={closeEditor}
      aria-labelledby={titleId}
      aria-describedby={introId}
      maxWidth="sm"
      fullWidth
    >
      {/* The switches live inside, and Material mounts this only while the
       * dialog is open -- so opening it is what sets them back to what was
       * last saved, and a dialog left half-changed and closed opens at the
       * saved answer rather than at the half-change. That is a remount rather
       * than an effect that resets them, because an effect would be a second
       * render every time and a place for the two to disagree. */}
      <Choices titleId={titleId} introId={introId} onClose={closeEditor} />
    </Dialog>
  );
}

function Choices({
  titleId,
  introId,
  onClose,
}: {
  titleId: string;
  introId: string;
  onClose: () => void;
}) {
  const { decision, save } = useCookieConsent();
  const { t } = useTranslation();

  /* Held here while they are being moved, and written nowhere until a button
   * is pressed. Whatever was chosen last time is where they start; nothing at
   * all is where they start on a first visit. */
  const [choices, setChoices] = useState<Choices>(
    decision?.choices ?? nothingOptional,
  );

  return (
    <Box sx={{ position: "relative", p: { xs: "1.75rem 1.5rem", sm: "2rem" } }}>
      <IconButton
        aria-label={t("Close")}
        onClick={onClose}
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
        {t("Your cookie choices")}
      </Typography>
      <Typography
        id={introId}
        variant="body2"
        sx={{ mt: 0.75, color: "text.secondary", lineHeight: 1.6 }}
      >
        {t(
          "Turn on what you are happy for this site to use. Everything except the strictly necessary is off until you turn it on, and you can change any of it later.",
        )}
      </Typography>
      <Typography
        component={Link}
        to="/privacy"
        onClick={onClose}
        variant="body2"
        sx={{
          display: "inline-block",
          mt: 0.5,
          color: "primary.light",
          textDecoration: "none",
          "&:hover": { textDecoration: "underline" },
        }}
      >
        {t("Privacy Policy")}
      </Typography>

      <Stack component="ul" sx={{ mt: 2, p: 0, gap: 2, listStyle: "none" }}>
        {categories.map((category) => (
          <CategoryRow
            key={category.id}
            label={t(category.label)}
            purpose={t(category.purpose)}
            kept={t(category.kept)}
            on={choices[category.id]}
            fixed={category.required === true}
            onChange={(on) =>
              setChoices((current) => ({ ...current, [category.id]: on }))
            }
          />
        ))}
      </Stack>

      {/* Refusing and accepting are the same press in the same place, which
       * is the whole of what "as easy to refuse as to accept" asks for. They
       * stack in the order they are written rather than reversed, so that the
       * order somebody meets them in is the order the bar uses too: a column
       * that puts Accept above Reject on a phone is a nudge, even when the
       * two buttons are drawn identically. */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ mt: 3, gap: 1.5, justifyContent: "flex-end" }}
      >
        <Button
          type="button"
          variant="outlined"
          onClick={() => save(nothingOptional)}
        >
          {t("Reject all")}
        </Button>
        <Button
          type="button"
          variant="outlined"
          onClick={() => save(everything)}
        >
          {t("Accept all")}
        </Button>
        <Button type="button" variant="contained" onClick={() => save(choices)}>
          {t("Save my choices")}
        </Button>
      </Stack>
    </Box>
  );
}

/* One category: what it is, what is kept under it, and the switch. The
 * strictly necessary one is drawn the same way and cannot be moved, rather
 * than being left out -- somebody reading this list is owed the whole list. */
function CategoryRow({
  label,
  purpose,
  kept,
  on,
  fixed,
  onChange,
}: {
  label: string;
  purpose: string;
  kept: string;
  on: boolean;
  fixed: boolean;
  onChange: (on: boolean) => void;
}) {
  const labelId = useId();
  const describedId = useId();

  return (
    <Stack
      component="li"
      direction="row"
      sx={{ gap: 1.5, alignItems: "flex-start" }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          id={labelId}
          component="h3"
          sx={{ fontSize: "0.95rem", fontWeight: 600 }}
        >
          {label}
        </Typography>
        <Typography
          id={describedId}
          variant="body2"
          sx={{ mt: 0.25, color: "text.secondary", lineHeight: 1.6 }}
        >
          {purpose} {kept}
        </Typography>
      </Box>
      <Switch
        checked={on}
        disabled={fixed}
        onChange={(event) => onChange(event.target.checked)}
        slotProps={{
          input: {
            "aria-labelledby": labelId,
            "aria-describedby": describedId,
          },
        }}
      />
    </Stack>
  );
}

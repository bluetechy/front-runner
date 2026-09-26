import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import CloseIcon from "@/shared/icons/CloseIcon";

/*
 * The ten codes, the once.
 *
 * This is the only dialog in the product that shows something nobody can ask
 * to see again: the API stores hashes, so once this is shut the codes exist
 * only wherever somebody put them. Everything about it is arranged around
 * that one fact.
 *
 * It says so twice, before and after the list. It offers Copy and Download
 * rather than expecting somebody to retype thirty characters off a screen.
 * And **it does not close on the backdrop or on Escape**, which is the one
 * place in this product a dialog takes that away: every other one is shut by
 * a stray click with nothing lost, and a stray click here costs somebody
 * their way back into the account. The close button and Done are both still
 * there, and both are one press.
 *
 * The codes are monospaced and in two columns, because they are read off the
 * screen and typed somewhere else, and a proportional font is where "l" and
 * "1" get confused. The alphabet they are made from has neither -- see
 * two-factor.service.ts -- and the typeface is the belt to that pair of
 * braces.
 */

export function RecoveryCodesDialog({
  codes,
  onClose,
}: {
  /* The codes, or null when the dialog is shut. Held by the caller, so the
   * list keeps being drawn through the closing transition rather than
   * emptying under it. */
  codes: string[] | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const [copied, setCopied] = useState(false);

  const text = (codes ?? []).join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* A browser that refuses the clipboard, which several do without a
       * gesture they recognize. The codes are on the screen and the download
       * is beside this, so there is nothing to report and nothing lost. */
      setCopied(false);
    }
  }

  function download() {
    const file = new Blob([`${text}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "front-runner-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog
      open={codes !== null}
      /* Deliberately not onClose: see the note above. A backdrop click here
       * would throw away the one copy of something. */
      aria-labelledby={titleId}
      maxWidth="xs"
      fullWidth
    >
      <Box
        sx={{
          position: "relative",
          p: { xs: "1.75rem 1.5rem", sm: "2rem 2.25rem" },
        }}
      >
        <IconButton
          aria-label="Close"
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
          sx={{ fontSize: "1.4rem", fontWeight: 700, pr: 4 }}
        >
          Your recovery codes
        </Typography>

        <Alert severity="warning" sx={{ mt: 1.75, borderRadius: 2 }}>
          Save these now. This is the only time they are shown: we keep them
          hashed, so nobody here can read them back to you.
        </Alert>

        <Box
          component="ul"
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 0.75,
            listStyle: "none",
            m: 0,
            mt: 2,
            p: 1.5,
            borderRadius: 2,
            backgroundColor: (theme) => theme.palette.brand.card,
            color: (theme) => theme.palette.brand.cardInk,
          }}
        >
          {(codes ?? []).map((code) => (
            <Typography
              component="li"
              key={code}
              sx={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "0.95rem",
                letterSpacing: "0.04em",
                textAlign: "center",
              }}
            >
              {code}
            </Typography>
          ))}
        </Box>

        <Typography
          variant="body2"
          sx={{ mt: 1.75, color: "text.secondary", lineHeight: 1.7 }}
        >
          Each code works once, and using one turns two-factor authentication
          off so you can login and set it up again. Making another set stops
          these ten working.
        </Typography>

        <Stack
          direction="row"
          sx={{ gap: 1, mt: 2.5, justifyContent: "flex-end", flexWrap: "wrap" }}
        >
          <Button
            type="button"
            variant="outlined"
            onClick={() => void copy()}
            sx={{ fontFamily: "inherit", fontStyle: "normal" }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            type="button"
            variant="outlined"
            onClick={download}
            sx={{ fontFamily: "inherit", fontStyle: "normal" }}
          >
            Download
          </Button>
          <Button
            type="button"
            variant="contained"
            onClick={onClose}
            sx={{ fontFamily: "inherit", fontStyle: "normal" }}
          >
            Done
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}

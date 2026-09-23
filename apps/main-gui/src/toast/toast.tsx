import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

/*
 * What a page says back when something it was asked to do has finished.
 *
 * It lands in the bottom right corner, clear of the rail down the left and of
 * the button that was just pressed, and it goes again after six seconds or
 * when it is dismissed. One at a time: a page holds a single notice and
 * replacing it is what showing the next one means.
 *
 * It sits a little higher than Material would put it, because the cookie
 * pill is in that corner on every page of both shells. The pill is the only
 * way back into the cookie choice, so the thing that is there for six seconds
 * stacks above the thing that is always there rather than over it.
 *
 * Three tones, and the two that matter are the two a save has: teal when it
 * saved, pink when it did not. `info` is neither -- it is the page saying
 * something nobody asked it to do anything about -- so it is the panel's own
 * violet rather than Material's blue, which is a color this product does not
 * own.
 *
 * The tone is never the whole message. Each one carries Material's icon for
 * its severity and a sentence that reads the same in gray, because nothing in
 * this product is said in color alone.
 */

export type ToastTone = "success" | "info" | "error";

export interface Notice {
  message: string;
  tone: ToastTone;
}

export function Toast({
  notice,
  onClose,
}: {
  notice: Notice | null;
  onClose: () => void;
}) {
  const tone = notice?.tone ?? "info";

  return (
    <Snackbar
      open={notice !== null}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      /* Clear of the cookie pill under it: 1rem off the bottom, a shade over
       * 2rem tall, and a gap between the two. One number rather than a
       * responsive pair, because Material moves this corner between 8px and
       * 24px with the window and the pill does not move at all. */
      sx={{ bottom: "4rem" }}
    >
      <Alert
        severity={tone}
        variant="filled"
        onClose={onClose}
        sx={{
          borderRadius: 2,
          color: "common.white",
          backgroundColor: (theme) =>
            tone === "success"
              ? theme.palette.brand.toastSuccess
              : tone === "error"
                ? theme.palette.brand.toastFailure
                : theme.palette.brand.panel,
          border: (theme) =>
            tone === "info"
              ? `1px solid ${theme.palette.brand.panelEdge}`
              : "none",
          /* Material tints a filled alert's icon and its close button off its
           * own severity color; on these three surfaces both are white. */
          "& .MuiAlert-icon, & .MuiAlert-action": { color: "inherit" },
        }}
      >
        {notice?.message}
      </Alert>
    </Snackbar>
  );
}

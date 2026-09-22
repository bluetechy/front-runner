import Box from "@mui/material/Box";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

/*
 * The foot of a lazily loaded list, and what fetches the next page. Used by
 * the bell's panel, which scrolls inside a box, and by the page, which
 * scrolls the window.
 *
 * An `IntersectionObserver` rather than a scroll handler: the browser works
 * out when this came into view, off the main thread, instead of this asking on
 * every frame of a scroll. `rootMargin` is what makes it early -- the observer
 * counts the element as visible while it is still `PAGE_AHEAD` below the fold,
 * so the request goes out about three rows before anybody reaches the end. By
 * the time they scroll that far the rows are already there and the list never
 * stops under them. That is the whole trick behind a feed that feels endless:
 * the page before the one you need.
 *
 * `root: null` is deliberate even where the list scrolls inside a box: the
 * observer walks up to the nearest scrollable ancestor on its own, and naming
 * one here would mean holding a ref to a box this component does not own.
 */

/* How far below the fold to start fetching, in pixels: roughly three rows. */
const PAGE_AHEAD = "220px";

export function MorePlease({
  hasMore,
  busy,
  onReached,
}: {
  hasMore: boolean;
  busy: boolean;
  onReached: () => void;
}) {
  const { t } = useTranslation();
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const watched = sentinel.current;
    /* Nothing more to fetch, or a fetch already in flight: no observer, so a
     * fast scroll cannot ask for the same page twice. */
    if (!watched || !hasMore || busy) return;
    /* jsdom, and any browser old enough to lack the API, simply never pages.
     * The list still works; it just ends where the first page ends. */
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onReached();
      },
      { rootMargin: `0px 0px ${PAGE_AHEAD} 0px` },
    );
    observer.observe(watched);
    return () => observer.disconnect();
  }, [hasMore, busy, onReached]);

  if (!hasMore && !busy) return null;

  return (
    <Box
      ref={sentinel}
      /* `output` rather than a div with role="status": announced either way,
       * and the element that means it. Somebody on a screen reader reaching
       * the end of the list is told that more is coming. */
      component="output"
      sx={{
        display: "block",
        padding: "0.9rem",
        textAlign: "center",
        fontSize: "0.8rem",
        color: (theme) => theme.palette.brand.cardInkMuted,
      }}
    >
      {busy ? t("Loading more…") : ""}
    </Box>
  );
}

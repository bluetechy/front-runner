import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WidgetView } from "@front-runner/widget-sdk";
import type { WidgetDefinition } from "@front-runner/widget-sdk";

/*
 * What is in the box, drawn.
 *
 * It renders with the **same runtime a customer embeds**: `WidgetView` out of
 * `packages/widget-sdk`, which is the component `<Widget>` uses once it has
 * fetched a definition. So this is not an approximation of the widget, it is
 * the widget, and the only thing it is missing is the fetch.
 *
 * That is worth more than a preview normally is. The gap a mock-up leaves is
 * exactly where surprises live: a countdown that formats differently, a
 * container that stacks at a width the studio never tried, a button whose
 * variant is not what the author expected. None of those can differ here.
 *
 * Three things it deliberately does not do:
 *
 * - **It does not validate.** The API's schema is the only authority on what a
 *   valid widget is, and a copy of Ajv in this bundle would be a second one to
 *   keep in step. So the preview draws what the runtime can draw and says
 *   nothing about whether it would be accepted; pressing Save is what asks.
 * - **It does not report events.** No `onEvent`, and `navigate` is swallowed:
 *   a click in a preview should not take somebody off the studio page, and a
 *   preview that counted as a real click would put noise in a customer's
 *   analytics before there were any.
 * - **It does not wait for a round trip.** The definition is the text on the
 *   screen, so the picture changes as somebody types.
 */

/* Long enough that a keystroke in the middle of a word does not re-render the
 * tree, short enough that it reads as live. */
const SETTLE_MS = 400;

/*
 * Whether this is enough of a document to try drawing.
 *
 * The renderer walks `root` and reads `canvas.width`, so a half-typed document
 * without them would throw inside somebody else's component. Checked here
 * rather than defended against in the SDK, because the SDK's contract is that
 * it is handed a validated definition and this is the one caller in the product
 * that is knowingly handing it something else.
 */
function drawable(parsed: unknown): WidgetDefinition | null {
  if (parsed === null || typeof parsed !== "object") return null;
  const document = parsed as Partial<WidgetDefinition>;
  if (!document.root || typeof document.root !== "object") return null;
  if (document.root.type !== "container") return null;
  if (typeof document.canvas?.width !== "number") return null;
  return document as WidgetDefinition;
}

export function WidgetPreview({
  definition,
  context,
}: {
  /* The text in the box, not a parsed document: this component is the one place
   * that decides whether what somebody has typed can be drawn yet. */
  definition: string;
  /* What a host page would supply. The studio has a field for it so a progress
   * bar and a `{{placeholder}}` can be seen doing something. */
  context?: Record<string, string | number>;
}) {
  const { t } = useTranslation();
  /* The last thing that could be drawn, kept while somebody is typing. Without
   * it the preview would blink out at every unbalanced brace, which is most of
   * the time somebody is editing. */
  const [drawn, setDrawn] = useState<WidgetDefinition | null>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const parsed: unknown = JSON.parse(definition);
        const document = drawable(parsed);
        setDrawn(document);
        setBroken(document === null);
      } catch {
        setBroken(true);
      }
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [definition]);

  return (
    <Box>
      <Box
        sx={{
          padding: 1.5,
          borderRadius: 2,
          border: (theme) => `1px dashed ${theme.palette.brand.cardEdge}`,
          /* A checkerboard, so a widget with a transparent background reads as
           * having one rather than as having failed to draw. */
          backgroundImage:
            "linear-gradient(45deg, rgba(0,0,0,0.04) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.04) 75%), linear-gradient(45deg, rgba(0,0,0,0.04) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.04) 75%)",
          backgroundSize: "18px 18px",
          backgroundPosition: "0 0, 9px 9px",
          /* The widget decides its own height; this keeps an empty one from
           * collapsing to nothing while somebody types. */
          minHeight: "6rem",
          /* A widget designed at 1200px in a card narrower than that is the
           * ordinary case, and the runtime scales to the box it is given. */
          overflowX: "auto",
        }}
      >
        {drawn ? (
          <WidgetView
            definition={drawn}
            context={context}
            /*
             * A click in a preview goes nowhere. `navigate` is handed a
             * function that does nothing, so the studio page cannot be
             * navigated away from by pressing a button in the thing being
             * edited, and `copy` is left alone because copying is harmless and
             * is worth being able to try.
             */
            environment={{ navigate: () => undefined }}
          />
        ) : (
          <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
            {t("Nothing to draw yet.")}
          </Typography>
        )}
      </Box>

      {/* Said quietly, and only about drawing. Whether the document is *valid*
       * is the API's answer and arrives when somebody saves: a preview that
       * claimed to know would be a second opinion about the schema. */}
      {broken ? (
        <Typography
          sx={{ marginTop: 0.75, fontSize: "0.8rem", color: "text.secondary" }}
        >
          {drawn
            ? t("Still showing the last version that could be drawn.")
            : t("This is not a widget document yet.")}
        </Typography>
      ) : null}
    </Box>
  );
}

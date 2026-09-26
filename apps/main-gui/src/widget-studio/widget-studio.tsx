import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CardSurface } from "../card-surface";
import { Toast, type Notice } from "../toast";
import { ProblemList } from "./problem-list";
import { WidgetList } from "./widget-list";
import { problemsIn, useSaveWidget, useWidgets } from "./widgets-api";

/*
 * The widget studio, at /widgets, which is Widgets in the rail.
 *
 * **It is a text box on purpose.** A widget definition is JSON, and this page
 * is where one is pasted in and saved. The builder this becomes -- a canvas, a
 * palette of elements, a properties panel -- is a different page and a much
 * larger one, and it needs the thing underneath it to work first: the schema,
 * the validator, the store, the endpoint and the runtime. So the first version
 * of the authoring surface is the smallest one that exercises all five, and
 * what it proves is that a definition written anywhere at all can be published
 * and drawn. See docs/TODO.md for what replaces it.
 *
 * The page's job, then, is almost entirely about the refusal. A pasted
 * document is usually wrong the first few times, and the API answers with every
 * problem in it at once: the toast says something went wrong, and the list
 * under the box says what, each one naming where it is. Getting that loop right
 * is worth more here than any amount of chrome.
 */

/* Left in the box on a first visit, because a page whose one control is an
 * empty text area does not say what it wants. It is also a working document:
 * pasting nothing and pressing Save publishes a real banner, which is the
 * fastest way to see the whole path end to end. */
const EXAMPLE = `{
  "schemaVersion": "1.0",
  "name": "Black Friday banner",
  "canvas": { "width": 1200, "height": 300 },
  "layout": { "type": "flow" },
  "delivery": { "allowedOrigins": ["http://localhost:5174"] },
  "root": {
    "id": "root",
    "type": "container",
    "layout": {
      "direction": "row",
      "align": "center",
      "justify": "space-between",
      "padding": 40,
      "gap": 24,
      "stackBelow": 640
    },
    "style": { "background": "#111111", "color": "#f5f5f5" },
    "children": [
      {
        "id": "headline",
        "type": "text",
        "value": "BLACK FRIDAY",
        "variant": "title",
        "style": { "fontSize": 40, "fontWeight": 800 }
      },
      {
        "id": "clock",
        "type": "countdown",
        "target": "2026-11-27T00:00:00-07:00",
        "format": "DD:HH:MM:SS",
        "expired": { "behavior": "replace", "text": "THE SALE IS LIVE" }
      },
      {
        "id": "cta",
        "type": "button",
        "label": "SHOP NOW",
        "variant": "primary",
        "style": { "background": "#d1258f", "color": "#ffffff" },
        "action": { "type": "navigate", "url": "/black-friday" }
      }
    ]
  }
}`;

export function WidgetStudio() {
  const { t } = useTranslation();
  const { data: widgets, isPending, error: listError } = useWidgets();
  const save = useSaveWidget();

  const [name, setName] = useState("Black Friday banner");
  const [definition, setDefinition] = useState(EXAMPLE);
  /* Which widget a save writes a new version of. Empty means a new one, which
   * is what the page starts on: choosing one out of the list below is how
   * somebody edits rather than creates. */
  const [widgetId, setWidgetId] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  /* The problems from the last refusal, kept after the toast has gone. A toast
   * that holds eight sentences is a toast nobody can read to the end of before
   * it disappears, so it says the first one and this list holds all of them. */
  const [problems, setProblems] = useState<string[]>([]);

  async function submit() {
    setProblems([]);
    try {
      const saved = await save.mutateAsync({
        name,
        definition,
        widgetId: widgetId || undefined,
      });
      /* The id is the thing somebody came here for, so it is in the sentence
       * rather than only in the table underneath. */
      setWidgetId(saved.WidgetId);
      setNotice({
        message: t("Saved {{name}} as version {{version}}. Its id is {{id}}.", {
          name: saved.Name,
          version: saved.Version,
          id: saved.WidgetId,
        }),
        tone: "success",
      });
    } catch (failure: unknown) {
      const message =
        failure instanceof Error
          ? failure.message
          : t("The widget could not be saved.");
      const listed = problemsIn(message);
      setProblems(listed);
      /* The first problem rather than all of them: the panel below has the
       * rest, and it is still there in a minute. */
      setNotice({ message: listed[0] ?? message, tone: "error" });
    }
  }

  return (
    <>
      <Stack sx={{ marginBottom: { xs: 2, md: 2.5 } }}>
        <Typography
          variant="h2"
          sx={{ fontSize: "clamp(1.6rem, 3vw, 2.1rem)" }}
        >
          {t("Site Widgets")}
        </Typography>
        <Typography sx={{ fontSize: "0.95rem", color: "text.secondary" }}>
          {t(
            "Paste a widget definition, save it, and embed it with the id you get back.",
          )}
        </Typography>
      </Stack>

      <Stack sx={{ gap: { xs: 2, md: 2.5 } }}>
        <CardSurface title={t("Widget definition")}>
          <Stack sx={{ gap: 2 }}>
            <TextField
              label={t("Name")}
              value={name}
              onChange={(event) => setName(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              fullWidth
            />

            <TextField
              label={t("Widget id")}
              value={widgetId}
              onChange={(event) => setWidgetId(event.target.value.trim())}
              placeholder={t("Leave empty to create a new widget")}
              helperText={t(
                "Saving over an id adds a version. Everything already embedded starts serving it.",
              )}
              fullWidth
            />

            {/*
             * The box itself. Monospace, because it holds JSON and a proportional
             * font makes a bracket somebody is hunting for harder to find, and
             * `spellCheck` off for the same reason a code editor turns it off:
             * every property name in the document would otherwise be underlined.
             */}
            <TextField
              label={t("Definition")}
              value={definition}
              onChange={(event) => setDefinition(event.target.value)}
              multiline
              minRows={16}
              fullWidth
              slotProps={{
                htmlInput: {
                  spellCheck: false,
                  "aria-describedby": problems.length
                    ? "widget-problems"
                    : undefined,
                },
              }}
              sx={{
                "& .MuiInputBase-inputMultiline": {
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: "0.82rem",
                  lineHeight: 1.6,
                },
              }}
            />

            <ProblemList problems={problems} />

            <Stack
              direction="row"
              sx={{ gap: 1.5, alignItems: "center", flexWrap: "wrap" }}
            >
              <Button
                variant="contained"
                onClick={() => void submit()}
                disabled={save.isPending || !name.trim() || !definition.trim()}
              >
                {save.isPending ? t("Saving") : t("Save widget")}
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  setWidgetId("");
                  setProblems([]);
                }}
                disabled={save.isPending}
              >
                {t("Start a new widget")}
              </Button>
            </Stack>
          </Stack>
        </CardSurface>

        <CardSurface title={t("Saved widgets")}>
          <WidgetList
            widgets={widgets ?? []}
            loading={isPending}
            error={listError?.message ?? null}
            selectedId={widgetId}
            onChoose={(chosen) => {
              setWidgetId(chosen.WidgetId);
              setName(chosen.Name);
              setProblems([]);
              /*
               * The name and the id, not the definition.
               *
               * Reading a definition back would mean a second query and a
               * second answer to "what is on the screen": the box would hold
               * version 4 while the list said 5, and a save would quietly
               * write whichever the page happened to be holding. Choosing a
               * widget here means "save over this one", and what gets saved is
               * what is in the box. Editing an existing definition properly is
               * a read of it and a diff, which is the builder's job.
               */
              setNotice({
                message: t("Saving will add a version to {{name}}.", {
                  name: chosen.Name,
                }),
                tone: "info",
              });
            }}
          />
        </CardSurface>
      </Stack>

      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}

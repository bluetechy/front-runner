import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CardSurface } from "../card-surface";
import { Toast, type Notice } from "../toast";
import { EXAMPLE } from "./example";
import { ProblemList } from "./problem-list";
import { VersionList } from "./version-list";
import { WidgetList } from "./widget-list";
import { WidgetPreview } from "./widget-preview";
import {
  problemsIn,
  useOpenWidget,
  usePublishWidget,
  useSaveWidget,
  useUnpublishWidget,
  useWidgetVersions,
  useWidgets,
  type WidgetSummary,
} from "./widgets-api";

/*
 * The widget studio, at /widgets, which is Site Widgets in the rail.
 *
 * **It is a text box on purpose.** A widget definition is JSON, and this page is
 * where one is pasted in, saved and published. The builder this becomes -- a
 * canvas, a palette of elements, a properties panel -- is a different page and a
 * much larger one, and it needs the thing underneath it to work first: the
 * schema, the validator, the store, the endpoint and the runtime.
 *
 * What the page has to keep straight is the difference between three things,
 * because it is the whole lifecycle and a page that blurred it would publish
 * work nobody meant to publish:
 *
 *   the box        what somebody is editing right now. Nobody is served it.
 *   the draft      the last thing saved. Nobody is served that either.
 *   the published  what browsers get, until somebody says otherwise.
 *
 * So **Save draft** and **Publish** are separate buttons, and publishing names a
 * version. Rollback is not a third button: it is publishing an earlier version
 * from the history, which is why the history has Open beside Publish.
 */

export function WidgetStudio() {
  const { t } = useTranslation();
  const { data: widgets, isPending, error: listError } = useWidgets();
  const save = useSaveWidget();
  const publish = usePublishWidget();
  const unpublish = useUnpublishWidget();
  const open = useOpenWidget();

  const [name, setName] = useState("Black Friday banner");
  const [definition, setDefinition] = useState(EXAMPLE);
  /* Which widget the box is about. Empty means a new one, which is what the
   * page starts on. */
  const [widgetId, setWidgetId] = useState("");
  /*
   * Which version the box was opened at, and the reason the page can be trusted
   * to save over things.
   *
   * It goes back to the API with the save, which refuses if the draft has moved
   * since: somebody else's tab, or this person's own second one. Null means the
   * box was typed rather than opened, so nothing anybody has seen is at risk.
   */
  const [openedVersion, setOpenedVersion] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  /* The problems from the last refusal, kept after the toast has gone. A toast
   * that holds eight sentences is a toast nobody can read to the end of before
   * it disappears, so it says the first one and this list holds all of them. */
  const [problems, setProblems] = useState<string[]>([]);
  /* Which version has a publish in flight, so its row says so and the others
   * are held: two publishes at once would be two answers to what the world
   * sees. */
  const [publishing, setPublishing] = useState<number | null>(null);
  /* What a host page would tell the widget. One field is enough to see a
   * progress bar and a `{{placeholder}}` doing something in the preview. */
  const [cartTotal, setCartTotal] = useState("50");

  const versions = useWidgetVersions(widgetId);
  const chosen = widgets?.find((widget) => widget.WidgetId === widgetId);
  const draft = chosen?.DraftVersion ?? openedVersion;

  function fail(failure: unknown, fallback: string) {
    const message = failure instanceof Error ? failure.message : t(fallback);
    const listed = problemsIn(message);
    setProblems(listed);
    /* The first problem rather than all of them: the panel below has the rest,
     * and it is still there in a minute. */
    setNotice({ message: listed[0] ?? message, tone: "error" });
  }

  async function submit() {
    setProblems([]);
    try {
      const saved = await save.mutateAsync({
        name,
        definition,
        widgetId: widgetId || undefined,
        expectedDraftVersion: openedVersion ?? undefined,
      });
      setWidgetId(saved.WidgetId);
      /* The box now holds the version that was just written, so the next save
       * is checked against this one. */
      setOpenedVersion(saved.DraftVersion);
      /* Which version is live is the thing somebody most needs to hear after a
       * save, because the answer is "not this one". */
      setNotice({
        message:
          saved.PublishedVersion === null
            ? t("Saved {{name}} as draft {{version}}. Nothing is serving it.", {
                name: saved.Name,
                version: saved.DraftVersion,
              })
            : t(
                "Saved {{name}} as draft {{version}}. Version {{live}} is still live.",
                {
                  name: saved.Name,
                  version: saved.DraftVersion,
                  live: saved.PublishedVersion,
                },
              ),
        tone: "success",
      });
    } catch (failure: unknown) {
      fail(failure, "The widget could not be saved.");
    }
  }

  async function putLive(version: number) {
    setProblems([]);
    setPublishing(version);
    try {
      const published = await publish.mutateAsync({ widgetId, version });
      setNotice({
        message: t("Version {{version}} is live. Its id is {{id}}.", {
          version,
          id: published.WidgetId,
        }),
        tone: "success",
      });
    } catch (failure: unknown) {
      fail(failure, "The widget could not be published.");
    } finally {
      setPublishing(null);
    }
  }

  async function takeDown() {
    setProblems([]);
    try {
      await unpublish.mutateAsync({ widgetId });
      setNotice({
        message: t(
          "{{name}} is no longer being served. Nothing was deleted, and publishing a version puts it back.",
          { name },
        ),
        tone: "info",
      });
    } catch (failure: unknown) {
      fail(failure, "The widget could not be taken down.");
    }
  }

  /* Open a version into the box. It comes back as stored, which is compact, and
   * is laid out here: how JSON is arranged in a text area is a question about a
   * text area. */
  async function openInto(id: string, version?: number) {
    setProblems([]);
    try {
      const document = await open(id, version);
      setWidgetId(document.WidgetId);
      setName(document.Name);
      setDefinition(JSON.stringify(JSON.parse(document.Definition), null, 2));
      setOpenedVersion(document.Version);
      setNotice({
        message: document.IsPublished
          ? t("Opened version {{version}}, which is the one being served.", {
              version: document.Version,
            })
          : t("Opened version {{version}}. It is not being served.", {
              version: document.Version,
            }),
        tone: "info",
      });
    } catch (failure: unknown) {
      fail(failure, "That widget could not be opened.");
    }
  }

  function startFresh() {
    setWidgetId("");
    setOpenedVersion(null);
    setProblems([]);
    setName("Black Friday banner");
    setDefinition(EXAMPLE);
    setNotice({ message: t("Started a new widget."), tone: "info" });
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
            "Paste a widget definition, save it as a draft, then publish the version you want sites to serve.",
          )}
        </Typography>
      </Stack>

      <Stack sx={{ gap: { xs: 2, md: 2.5 } }}>
        <CardSurface
          title={t("Widget definition")}
          action={
            /* Where the widget stands, on the heading line rather than found by
             * comparing two numbers in a table. */
            widgetId ? (
              <Stack direction="row" sx={{ gap: 0.5, alignItems: "center" }}>
                <Chip
                  size="small"
                  variant="outlined"
                  label={t("Draft {{version}}", { version: draft ?? 1 })}
                />
                {chosen?.PublishedVersion ? (
                  <Chip
                    size="small"
                    color="success"
                    label={t("Live {{version}}", {
                      version: chosen.PublishedVersion,
                    })}
                  />
                ) : (
                  <Chip size="small" label={t("Not published")} />
                )}
              </Stack>
            ) : null
          }
        >
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
              onChange={(event) => {
                setWidgetId(event.target.value.trim());
                /* An id typed by hand is not a version anybody opened, so the
                 * next save must not claim to have seen one. */
                setOpenedVersion(null);
              }}
              placeholder={t("Leave empty to create a new widget")}
              helperText={t(
                "Saving adds a draft version. Publishing is what changes the sites it is on.",
              )}
              fullWidth
            />

            {/*
             * The box itself. Monospace, because it holds JSON and a
             * proportional font makes a bracket somebody is hunting for harder
             * to find, and `spellCheck` off for the same reason a code editor
             * turns it off: every property name in the document would otherwise
             * be underlined.
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
                {save.isPending ? t("Saving") : t("Save draft")}
              </Button>

              {/* Publishing the draft is the common case and is offered here;
               * publishing anything else is a row in the history, which is where
               * a version can be read before it goes live. */}
              <Button
                variant="outlined"
                onClick={() => {
                  if (draft) void putLive(draft);
                }}
                disabled={
                  !widgetId ||
                  draft === null ||
                  publishing !== null ||
                  save.isPending ||
                  chosen?.DraftVersion === chosen?.PublishedVersion
                }
              >
                {t("Publish the draft")}
              </Button>

              {chosen?.PublishedVersion ? (
                <Button
                  variant="text"
                  color="error"
                  onClick={() => void takeDown()}
                  disabled={unpublish.isPending}
                >
                  {t("Take it down")}
                </Button>
              ) : null}

              <Button
                variant="text"
                onClick={startFresh}
                disabled={save.isPending}
              >
                {t("Start a new widget")}
              </Button>
            </Stack>
          </Stack>
        </CardSurface>

        <CardSurface
          title={t("Preview")}
          action={
            <TextField
              label={t("cart.total")}
              value={cartTotal}
              onChange={(event) => setCartTotal(event.target.value)}
              size="small"
              sx={{ width: "8rem" }}
            />
          }
        >
          {/* Drawn with the runtime a customer embeds, so this is the widget
           * rather than a picture of it. See widget-preview.tsx. */}
          <WidgetPreview
            definition={definition}
            context={{ "cart.total": cartTotal }}
          />
        </CardSurface>

        {widgetId ? (
          <CardSurface title={t("History")}>
            <VersionList
              versions={versions.data ?? []}
              loading={versions.isPending}
              error={versions.error?.message ?? null}
              openVersion={openedVersion}
              busyVersion={publishing}
              onOpen={(version) => void openInto(widgetId, version)}
              onPublish={(version) => void putLive(version)}
            />
          </CardSurface>
        ) : null}

        <CardSurface title={t("Saved widgets")}>
          <WidgetList
            widgets={widgets ?? []}
            loading={isPending}
            error={listError?.message ?? null}
            selectedId={widgetId}
            onOpen={(widget: WidgetSummary) => void openInto(widget.WidgetId)}
          />
        </CardSurface>
      </Stack>

      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}

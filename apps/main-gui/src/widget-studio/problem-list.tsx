import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import { useTranslation } from "react-i18next";

/*
 * What was wrong with the document, one line per problem.
 *
 * This is the part of the studio worth building carefully, because it is what
 * somebody reads over and over while getting a definition right. The API
 * answers with every failing field at once rather than the first, each naming
 * its own place in the document -- `root.children[0].action.url` -- so the
 * useful presentation is a list rather than a paragraph.
 *
 * It is an `Alert` rather than red text, so the failure is announced to a
 * screen reader as an alert and carries Material's icon as well as the color:
 * nothing in this product is said in color alone.
 */
export function ProblemList({ problems }: { problems: readonly string[] }) {
  const { t } = useTranslation();
  if (!problems.length) return null;

  return (
    <Alert severity="error" id="widget-problems" sx={{ borderRadius: 2 }}>
      <AlertTitle sx={{ marginBottom: 0.5 }}>
        {t("That definition was refused", { count: problems.length })}
      </AlertTitle>
      {/* A list, and a real one: a screen reader then says how many there are
       * before reading them, which is the first thing somebody wants to know. */}
      <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
        {problems.map((problem) => (
          <li key={problem} style={{ fontSize: "0.86rem", lineHeight: 1.6 }}>
            <code style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>
              {problem}
            </code>
          </li>
        ))}
      </ul>
    </Alert>
  );
}

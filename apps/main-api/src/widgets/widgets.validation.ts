import { Ajv2020 } from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";
import { LIMITS, widgetSchema } from "./widget.schema.js";

/*
 * The guardrail layer: everything a widget definition has to survive before it
 * is stored.
 *
 * It is a pipeline rather than one check, because the questions are of
 * different kinds and a schema can only answer the first:
 *
 *     size -> JSON Schema -> tree shape -> URLs -> origins
 *
 * All of it runs on every save, and every failure is reported rather than the
 * first. That is the same decision `ZodPipe` makes for the profile form and
 * for the same reason: a document that has to be submitted once per mistake is
 * a document nobody finishes, and a widget definition has a great many more
 * places to be wrong than a profile does.
 */

/* Ajv, compiled once. Compiling a schema is not cheap and this one never
 * changes, so the cost is paid at import rather than per request. */
const ajv = new Ajv2020({
  /* Every failing field, not the first. */
  allErrors: true,
  /* `oneOf` over eight element types produces eight failures for one wrong
   * property without this: with it, Ajv reads `type` first and reports against
   * the one branch the author meant. It is the difference between "must match
   * exactly one schema in oneOf" and "root.children[0].label: must be string". */
  discriminator: true,
  /* Ajv's own strictness about the schema, which is about our schema rather
   * than about documents. On, because a typo in a keyword name would otherwise
   * be a rule that silently never applies. */
  strict: true,
});
/*
 * The one format the language uses, defined here rather than brought in with
 * `ajv-formats`.
 *
 * That package carries the whole of the format vocabulary -- email, ipv6,
 * uri-template, regex, thirty more -- for the single keyword this schema
 * names, and it is a CommonJS default export that neither this compiler nor
 * Node agrees with the other about. Twelve lines is cheaper than the
 * dependency and says exactly what the product means, which the standard
 * format does not:
 *
 * **an offset is required.** "2026-11-27T00:00:00" is a different moment in
 * every timezone the page is read in, and a countdown is read on pages all
 * over the world. The author says when the sale ends, once, and says it in a
 * way that cannot mean two things. `date-time` in RFC 3339 requires one too;
 * this is that rule enforced rather than assumed.
 */
const ISO_INSTANT =
  /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;

ajv.addFormat("date-time", {
  type: "string",
  validate: (value: string) =>
    ISO_INSTANT.test(value) && Number.isFinite(Date.parse(value)),
});

const validateShape: ValidateFunction = ajv.compile(widgetSchema as object);

export interface Valid<T> {
  ok: true;
  definition: T;
}

export interface Invalid {
  ok: false;
  /* One sentence per problem, each naming where it is. What the studio page
   * shows and what a caller of the API is told. */
  errors: string[];
}

export type Validation<T> = Valid<T> | Invalid;

/*
 * Where a failure is, written the way somebody reading it would say it.
 *
 * Ajv's `instancePath` is a JSON pointer: `/root/children/0/action/url`. That
 * is precise and nobody reads it. `root.children[0].action.url` is the same
 * fact in the notation the document is written in.
 */
function where(error: ErrorObject): string {
  const path = error.instancePath
    .split("/")
    .filter(Boolean)
    .map((part) => (/^\d+$/.test(part) ? `[${part}]` : `.${part}`))
    .join("")
    .replace(/^\./, "");
  /* A missing property is reported against the object that should have had it,
   * so the property's own name is in `params` rather than in the path. Put it
   * where a reader will look for it. */
  const missing =
    error.keyword === "required"
      ? (error.params as { missingProperty?: string }).missingProperty
      : undefined;
  if (missing) return path ? `${path}.${missing}` : missing;
  return path || "the document";
}

function sentence(error: ErrorObject): string {
  /* Ajv says "must have required property 'id'" against the parent; the path
   * above already names the property, so the message is trimmed to the part
   * that is not a repetition. */
  const message =
    error.keyword === "required"
      ? "is required"
      : (error.message ?? "is not allowed here");
  const allowed = (error.params as { allowedValues?: unknown[] }).allowedValues;
  return allowed
    ? `${where(error)}: ${message} (${allowed.map(String).join(", ")})`
    : `${where(error)}: ${message}`;
}

/* See the SDK's `actions.ts`: a browser strips these before it resolves a
 * scheme, so a URL holding one is refused rather than cleaned up. */
/* Deliberate: matching control characters is the whole point of the check. */
// oxlint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

/* The schemes a URL in a definition may use. The same list the SDK enforces
 * again in the browser: this is the copy that decides what may be stored. */
const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);

export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("//")) return false;
  if (CONTROL_CHARACTERS.test(trimmed)) return false;
  if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(trimmed)) return true;
  try {
    return SAFE_SCHEMES.has(new URL(trimmed).protocol);
  } catch {
    return false;
  }
}

/*
 * An origin a browser may render this widget from.
 *
 * Exact: a scheme and a host, a port where there is one, and nothing else. No
 * wildcards and no suffix matching, because `evil-northwind.test` ends with
 * the same characters as `northwind.test` and a suffix rule is how that gets
 * through. A path, a query or a trailing slash is refused rather than trimmed:
 * an allowlist whose entries are cleaned up on the way in is an allowlist
 * whose entries nobody can predict.
 *
 * `null` is refused by name. A `file://` page, a sandboxed iframe and some
 * redirects all send it as their Origin, and it must never match an entry.
 */
export function isExactOrigin(value: string): boolean {
  if (value !== value.trim() || value === "null") return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (!parsed.hostname || parsed.hostname.includes("*")) return false;
  /* `new URL("https://a.test")` has pathname "/", which is what a written
   * origin normalizes to. Anything more than that is not an origin. */
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) return false;
  if (parsed.username || parsed.password) return false;
  /* Exactly what a browser sends, which has no trailing slash. Accepting
   * "https://shop.northwind.test/" here and then comparing for equality
   * against an Origin header would be an entry that is stored, looks right in
   * the document, and never matches anything. Refusing it says so at the
   * moment the author can still fix it. */
  return value === parsed.origin;
}

interface Node {
  id?: unknown;
  type?: unknown;
  children?: unknown;
  action?: { type?: unknown; url?: unknown };
  src?: unknown;
}

/*
 * The checks that are about the document as a whole.
 *
 * None of these is expressible in JSON Schema. Depth and total size are
 * properties of a tree rather than of any node in it; uniqueness of ids is a
 * fact about the whole document; and whether a URL is one we will follow needs
 * a URL parser rather than a pattern.
 *
 * One walk, collecting everything, because three walks would be three chances
 * to disagree about what counts as a node.
 */
function walk(root: Node): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  let nodes = 0;

  const visit = (node: Node, path: string, depth: number) => {
    nodes += 1;
    if (depth > LIMITS.depth) {
      errors.push(
        `${path}: containers are nested more than ${LIMITS.depth} deep`,
      );
      return;
    }

    const id = typeof node.id === "string" ? node.id : "";
    /* Two elements with one id is the failure that only shows up later, when
     * an edit names an element and there are two of it. React would also key
     * them the same, which is its own quiet bug. */
    if (id && seen.has(id)) errors.push(`${path}.id: "${id}" is used twice`);
    if (id) seen.add(id);

    if (
      node.action?.type === "navigate" &&
      typeof node.action.url === "string" &&
      !isSafeUrl(node.action.url)
    )
      errors.push(`${path}.action.url: is not a URL this platform will follow`);

    if (typeof node.src === "string" && !isSafeUrl(node.src))
      errors.push(`${path}.src: is not a URL this platform will follow`);

    if (Array.isArray(node.children))
      node.children.forEach((child, index) =>
        visit(child as Node, `${path}.children[${index}]`, depth + 1),
      );
  };

  visit(root, "root", 1);
  if (nodes > LIMITS.nodes)
    errors.push(
      `the document: has ${nodes} elements, and the limit is ${LIMITS.nodes}`,
    );
  return errors;
}

interface Definition {
  canvas?: { height?: unknown };
  layout?: { type?: unknown };
  delivery?: { allowedOrigins?: unknown };
  root?: Node;
}

/*
 * Validate a definition, and answer either the document or every reason it was
 * refused.
 *
 * The input is whatever arrived: a parsed object out of a GraphQL string, or a
 * value that is not an object at all. Nothing is trusted and nothing is
 * repaired -- a document is either valid or it is refused with a list of
 * sentences, because a save that silently fixed something is a save whose
 * result the author did not write.
 */
export function validateDefinition<T>(input: unknown): Validation<T> {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    return { ok: false, errors: ["the document: is not a JSON object"] };

  /* Measured as it would be stored, which is also how it will be served. */
  const size = Buffer.byteLength(JSON.stringify(input), "utf8");
  if (size > LIMITS.definitionBytes)
    return {
      ok: false,
      errors: [
        `the document: is ${size} bytes, and the limit is ${LIMITS.definitionBytes}`,
      ],
    };

  if (!validateShape(input))
    return {
      ok: false,
      /* Deduplicated: `oneOf` can report the same missing property against two
       * branches, and the same sentence twice reads as two problems. */
      errors: [...new Set((validateShape.errors ?? []).map(sentence))],
    };

  const definition = input as Definition;
  const errors: string[] = [];

  if (definition.root) errors.push(...walk(definition.root));

  /*
   * A freeform composition with no height has no coordinate space to place
   * anything in: every child would be positioned inside a box whose height is
   * whatever its contents came to, which is the one thing absolute positioning
   * is meant to stop depending on.
   */
  if (
    definition.layout?.type === "absolute" &&
    definition.canvas?.height === undefined
  )
    errors.push(
      "canvas.height: is required when the layout is absolute, because that is what the coordinates are measured in",
    );

  const origins = definition.delivery?.allowedOrigins;
  if (Array.isArray(origins))
    origins.forEach((origin, index) => {
      if (typeof origin !== "string" || !isExactOrigin(origin))
        errors.push(
          `delivery.allowedOrigins[${index}]: must be an exact origin, like https://shop.northwind.test`,
        );
    });

  if (errors.length) return { ok: false, errors };
  return { ok: true, definition: input as T };
}

/*
 * The same thing, starting from the text somebody pasted.
 *
 * Parsing is separated from validating because a JSON syntax error is a
 * different kind of problem with a much better message available: the browser
 * and Node both say which character they gave up at, and that sentence is far
 * more useful than anything this file could say about the document.
 */
export function parseAndValidate<T>(text: string): Validation<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      errors: [
        `the document: is not valid JSON (${error instanceof Error ? error.message : "it could not be parsed"})`,
      ],
    };
  }
  return validateDefinition<T>(parsed);
}

/*
 * Widget Schema v1: the language a widget definition is written in.
 *
 * JSON Schema draft 2020-12, and it is the authority. The SDK carries a
 * TypeScript copy of these shapes so a customer's editor can autocomplete a
 * document they are writing by hand, and main-gui's studio will eventually
 * carry a third for the same reason the profile form does; this one decides.
 * That arrangement, and the rule that a field added here is added there in the
 * same change, is written down in docs/widgets.md.
 *
 * **Why it is a TypeScript module and not a .json file.** The obvious thing is
 * `widget.schema.json`, and it was very nearly that. What stopped it is this
 * app's build: `tsc` compiles `src/**\/*.ts` into `dist` and copies nothing
 * else, so a JSON file beside this one would have to be taught to both the
 * compiler (`resolveJsonModule`, an import attribute) and the Docker image,
 * for no gain -- a schema is an object either way, Ajv takes an object, and
 * `GET /widgets/schema` serves this one as JSON to anybody who wants the file,
 * which is how it reaches a customer or a model. What is gained is that the
 * language can be commented, which for the one file everything else in the
 * platform agrees on is worth more than the file extension.
 *
 * **What the schema does and does not decide.** It decides shape: which
 * properties exist, what type each one is, how long a string may be, which
 * element types there are. It cannot decide the things that are about the
 * document as a whole -- how deep the tree is, how many elements in total,
 * whether two of them share an id, whether a URL is a scheme we will follow --
 * and those are in `widgets.validation.ts` beside it. Both run on every save,
 * and a document has to pass both.
 */

/* Limits, gathered here because they are the answer to "how big may a widget
 * be" and that question gets asked from three places. They are bounds rather
 * than a cost model: generous enough that no honest document meets them, small
 * enough that no document is a denial of service. */
export const LIMITS = {
  /* Bytes of JSON. A widget is a description of a banner; 64 KiB of it is a
   * mistake, and it is also the body limit the API already enforces. */
  definitionBytes: 64 * 1024,
  /* Elements in one document, counting the root. */
  nodes: 200,
  /* How deeply containers may nest. Ten is deeper than any real design and
   * shallow enough that a recursive renderer cannot be made to blow a stack. */
  depth: 10,
  /* Origins one widget may be rendered from. */
  origins: 20,
} as const;

/* An element id: the author's, stable across edits, and the React key. Kept to
 * a conservative alphabet because it ends up in a DOM attribute. */
const ID = {
  type: "string",
  minLength: 1,
  maxLength: 64,
  pattern: "^[A-Za-z0-9_-]+$",
} as const;

/*
 * A URL, as far as a schema can say it.
 *
 * An allowlist written as a pattern: one of the three schemes a link on a page
 * uses, or something carrying no scheme at all, which is a relative URL and the
 * common case on a customer's own site. The lookahead is what makes the last
 * branch mean "no scheme" rather than "any scheme", and `//` is refused with
 * it because a protocol-relative URL reads as a path to anybody skimming the
 * document.
 *
 * The real check is `isSafeUrl` in `widgets.validation.ts`, which parses the
 * URL and tests its scheme. This is here as well because a schema is the thing
 * an author reads and a model is given, and a language whose written
 * definition of a URL permits `javascript:` is a language that invites one.
 */
const URL_STRING = {
  type: "string",
  minLength: 1,
  maxLength: 2048,
  pattern:
    "^(?:(?:https?://|mailto:|tel:).+|(?![A-Za-z][A-Za-z0-9+.-]*:)(?!//).+)$",
} as const;

const COLOR = { type: "string", maxLength: 64 } as const;

const STYLE = {
  type: "object",
  additionalProperties: false,
  properties: {
    background: COLOR,
    color: COLOR,
    fontSize: { type: "number", minimum: 1, maximum: 400 },
    fontWeight: { type: "integer", minimum: 100, maximum: 900 },
    fontFamily: { type: "string", maxLength: 200 },
    textAlign: { enum: ["left", "center", "right"] },
    textTransform: { enum: ["none", "uppercase", "capitalize"] },
    lineHeight: { type: "number", minimum: 0.5, maximum: 4 },
    borderColor: COLOR,
    borderWidth: { type: "number", minimum: 0, maximum: 64 },
    borderRadius: { type: "number", minimum: 0, maximum: 999 },
    opacity: { type: "number", minimum: 0, maximum: 1 },
    shadow: { type: "boolean" },
  },
} as const;

const LAYOUT = {
  type: "object",
  additionalProperties: false,
  properties: {
    direction: { enum: ["row", "column"] },
    align: { enum: ["start", "center", "end", "stretch"] },
    justify: {
      enum: ["start", "center", "end", "space-between", "space-around"],
    },
    gap: { type: "number", minimum: 0, maximum: 400 },
    padding: { type: "number", minimum: 0, maximum: 400 },
    wrap: { type: "boolean" },
    stackBelow: { type: "number", minimum: 0, maximum: 2000 },
  },
} as const;

const POSITION = {
  type: "object",
  additionalProperties: false,
  required: ["x", "y"],
  properties: {
    x: { type: "number", minimum: -10000, maximum: 10000 },
    y: { type: "number", minimum: -10000, maximum: 10000 },
  },
} as const;

const SIZE = {
  type: "object",
  additionalProperties: false,
  properties: {
    width: { type: "number", minimum: 0, maximum: 10000 },
    height: { type: "number", minimum: 0, maximum: 10000 },
  },
} as const;

const ANIMATION = {
  type: "object",
  additionalProperties: false,
  required: ["effect"],
  properties: {
    effect: { enum: ["fadeIn", "slideUp", "pulse"] },
    duration: { type: "integer", minimum: 0, maximum: 10000 },
    delay: { type: "integer", minimum: 0, maximum: 10000 },
  },
} as const;

/*
 * The three verbs.
 *
 * There is no `javascript` action, and that absence is the whole security
 * model rather than a rule inside it: an author picking from three verbs
 * cannot reach the customer's page, because there is nothing in the language
 * that carries code. `oneOf` with a `const` type on each branch is what makes
 * a wrong property on the wrong verb an error rather than an ignored field.
 */
const ACTION = {
  type: "object",
  /* The tag is `required` inside each branch rather than out here: Ajv's
   * strict mode refuses a `required` naming a property the schema it sits on
   * does not declare, and this object declares no properties of its own. */
  discriminator: { propertyName: "type" },
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "url"],
      properties: {
        type: { const: "navigate" },
        url: URL_STRING,
        newTab: { type: "boolean" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "name"],
      properties: {
        type: { const: "trackEvent" },
        name: { type: "string", minLength: 1, maxLength: 100 },
        properties: {
          type: "object",
          maxProperties: 20,
          additionalProperties: { type: "string", maxLength: 200 },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "text"],
      properties: {
        type: { const: "copyText" },
        text: { type: "string", minLength: 1, maxLength: 500 },
      },
    },
  ],
} as const;

/* What every element carries. Spread into each one rather than composed with
 * `allOf`, because `additionalProperties: false` and `allOf` do not combine
 * the way everybody expects: the inner schema does not know about the outer
 * one's properties, and every element would refuse `id`. */
const COMMON = {
  id: ID,
  style: STYLE,
  position: POSITION,
  size: SIZE,
  animation: ANIMATION,
} as const;

const TEXT = {
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "value"],
  properties: {
    ...COMMON,
    type: { const: "text" },
    value: { type: "string", maxLength: 2000 },
    variant: { enum: ["title", "subtitle", "body", "caption"] },
  },
} as const;

const IMAGE = {
  type: "object",
  additionalProperties: false,
  /* `alt` is required, which is a decision about the product rather than about
   * the data. An image with no alternative text is an image a screen reader
   * reads the URL of, and the author is the only person who knows what it
   * shows. Decoration says so by passing "". */
  required: ["id", "type", "src", "alt"],
  properties: {
    ...COMMON,
    type: { const: "image" },
    src: URL_STRING,
    alt: { type: "string", maxLength: 300 },
    fit: { enum: ["cover", "contain", "fill"] },
  },
} as const;

const BUTTON = {
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "label", "action"],
  properties: {
    ...COMMON,
    type: { const: "button" },
    label: { type: "string", minLength: 1, maxLength: 100 },
    action: ACTION,
    variant: { enum: ["primary", "secondary", "ghost"] },
  },
} as const;

const HOTSPOT = {
  type: "object",
  additionalProperties: false,
  /* Same reasoning as `image.alt`, and it matters more here: a transparent
   * region with no name is a link with no text, and it is often the only way
   * into whatever the picture is advertising. */
  required: ["id", "type", "label", "action"],
  properties: {
    ...COMMON,
    type: { const: "hotspot" },
    label: { type: "string", minLength: 1, maxLength: 200 },
    action: ACTION,
  },
} as const;

const COUNTDOWN = {
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "target"],
  properties: {
    ...COMMON,
    type: { const: "countdown" },
    /* An instant with an offset. `format: date-time` is what refuses "next
     * Tuesday" and "2026-11-27", and the offset is what stops the deadline
     * being a different moment in every timezone the page is read in. */
    target: { type: "string", format: "date-time" },
    format: { enum: ["DD:HH:MM:SS", "HH:MM:SS", "MM:SS"] },
    expired: {
      oneOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["behavior"],
          properties: { behavior: { const: "hide" } },
        },
        {
          type: "object",
          additionalProperties: false,
          required: ["behavior"],
          properties: { behavior: { const: "zero" } },
        },
        {
          type: "object",
          additionalProperties: false,
          required: ["behavior", "text"],
          properties: {
            behavior: { const: "replace" },
            text: { type: "string", minLength: 1, maxLength: 200 },
          },
        },
      ],
    },
  },
} as const;

const PROGRESS_BAR = {
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "source", "goal"],
  properties: {
    ...COMMON,
    type: { const: "progressBar" },
    source: {
      oneOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["type", "name"],
          properties: {
            type: { const: "variable" },
            name: { type: "string", minLength: 1, maxLength: 100 },
          },
        },
        {
          type: "object",
          additionalProperties: false,
          required: ["type", "value"],
          properties: {
            type: { const: "number" },
            value: { type: "number" },
          },
        },
      ],
    },
    /* Above nought, because the runtime divides by it. */
    goal: { type: "number", exclusiveMinimum: 0 },
    messages: {
      type: "object",
      additionalProperties: false,
      properties: {
        incomplete: { type: "string", maxLength: 300 },
        complete: { type: "string", maxLength: 300 },
      },
    },
    currency: { type: "string", pattern: "^[A-Z]{3}$" },
  },
} as const;

const PARTICLES = {
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "effect"],
  properties: {
    ...COMMON,
    type: { const: "particles" },
    effect: { enum: ["snow", "confetti"] },
    /* The runtime caps this again whatever is asked for. The bound is here so
     * that the refusal is a sentence about the document rather than a widget
     * that quietly renders less than it asked for. */
    density: { type: "number", minimum: 0, maximum: 24 },
  },
} as const;

/*
 * A container, and the one recursive point in the language.
 *
 * `$ref: "#/$defs/node"` is how JSON Schema says "and this may hold more of
 * the same", which is what makes the document a tree rather than a list. How
 * deep it may actually go is not expressible here and is checked in code.
 */
const CONTAINER = {
  type: "object",
  additionalProperties: false,
  required: ["id", "type"],
  properties: {
    ...COMMON,
    type: { const: "container" },
    layout: LAYOUT,
    children: {
      type: "array",
      maxItems: LIMITS.nodes,
      items: { $ref: "#/$defs/node" },
    },
  },
} as const;

/*
 * The document.
 *
 * `root` is one container rather than an array of elements: a tree needs a
 * trunk, and "a row of two stacked pairs" is a sentence a flat array cannot
 * say. `metadata` is the one place `additionalProperties` is open, because it
 * is the author's own bookkeeping and nothing reads it.
 */
export const widgetSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://frontrunner.example/schemas/widget/v1",
  title: "Front Runner Widget Definition v1",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "canvas", "root"],
  properties: {
    schemaVersion: { const: "1.0" },
    name: { type: "string", maxLength: 200 },
    canvas: {
      type: "object",
      additionalProperties: false,
      required: ["width"],
      properties: {
        width: { type: "number", minimum: 1, maximum: 10000 },
        height: { type: "number", minimum: 1, maximum: 10000 },
        responsive: { type: "boolean" },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: { type: { enum: ["flow", "absolute"] } },
    },
    delivery: {
      type: "object",
      additionalProperties: false,
      properties: {
        allowedOrigins: {
          type: "array",
          maxItems: LIMITS.origins,
          items: { type: "string", minLength: 1, maxLength: 255 },
        },
      },
    },
    variables: {
      type: "object",
      maxProperties: 50,
      additionalProperties: {
        oneOf: [{ type: "string", maxLength: 500 }, { type: "number" }],
      },
    },
    root: { $ref: "#/$defs/container" },
    metadata: { type: "object" },
  },
  $defs: {
    container: CONTAINER,
    /*
     * Every element type, as one choice.
     *
     * `oneOf` over branches that each pin `type` to a `const` means an unknown
     * element type is refused by name rather than ignored -- which is the
     * property the platform needs at this end. (The renderer at the other end
     * does the opposite and draws an unknown type as nothing, so that an old
     * copy of the SDK meeting a newer document loses one element rather than
     * the page. The two are not in conflict: nothing unknown is ever stored,
     * and the runtime is lenient about what it is nonetheless handed.)
     */
    node: {
      type: "object",
      /* Ajv reads `type` first and checks the one branch the author meant, so
       * a wrong property on a button is "root.children[0].label: must be
       * string" rather than eight failures ending in "must match exactly one
       * schema in oneOf". See `widgets.validation.ts`. */
      discriminator: { propertyName: "type" },
      oneOf: [
        CONTAINER,
        TEXT,
        IMAGE,
        BUTTON,
        HOTSPOT,
        COUNTDOWN,
        PROGRESS_BAR,
        PARTICLES,
      ],
    },
  },
} as const;

/* The vocabulary, as data. The SDK's registry exports the same eight names and
 * a test holds the two lists together: an element added to one end and not the
 * other is a document the API accepts and the runtime draws as nothing. */
export const elementTypes = [
  "container",
  "text",
  "image",
  "button",
  "hotspot",
  "countdown",
  "progressBar",
  "particles",
] as const;

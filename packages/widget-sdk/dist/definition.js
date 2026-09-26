/*
 * @no-test  Types and nothing else: every declaration in here is erased at
 * compile time, so there is no behavior to assert. What the shapes *mean* is
 * asserted by the elements that read them and, at the other end, by
 * `apps/main-api/src/widgets/widget.schema.json`, which is the authority.
 *
 * ---
 *
 * A widget definition: the document an author (a person today, a model later)
 * produces, the API validates, and this package renders.
 *
 * **The API's JSON Schema is the authority and this file is a copy of it.**
 * That is the arrangement the profile form already uses: the zod schema in
 * main-api decides, main-gui carries a copy so the browser can say the same
 * thing sooner, and the two are tested against the same cases at either end.
 * Here the copy buys a customer's editor autocompleting a document they are
 * writing by hand, and it buys this package its own types without depending
 * on the API's source. The cost is that a field added there has to be added
 * here, and `docs/widget-schema.md` is where that is written down.
 *
 * Nothing in here is a rectangle, a fill or a font stack. The types are
 * semantic -- a `button` with a `label` and an `action`, not a rect with text
 * on it -- because the renderer decides how intent becomes pixels, and
 * because a button that is a `<button>` is a button to a screen reader as
 * well as to a person looking at it.
 */
export {};
//# sourceMappingURL=definition.js.map
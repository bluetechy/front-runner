# Widgets

How a widget definition is validated, stored, versioned and served. The language
itself is [the widget schema](../../../packages/widget-sdk/docs/widget-schema.md);
this page is the server side of it.

```text
the studio (main-gui)                    a customer's site
        │                                        │
  saveWidget / publishWidget               GET /widgets/:id
  widgetDefinition / widgetVersions              │
        │                                        │
        ▼                                        ▼
  WidgetsResolver                         WidgetsController
        │                                        │
        └──────────► WidgetsService ◄────────────┘
                          │
              parseAndValidate (Ajv + the walk)
                          │
          dbo.SaveWidget / dbo.PublishWidget / dbo.GetWidget
                          │
                 Widgets + WidgetVersions
```

## The lifecycle

A widget has two version numbers, and the difference between them is the whole
of it:

| Column             | What it is                                        |
| ------------------ | ------------------------------------------------- |
| `DraftVersion`     | the most recent save. Nobody is served it.        |
| `PublishedVersion` | what browsers get. Null until somebody publishes. |

So **saving is not publishing**. Somebody can work on a banner all afternoon
while the version on a customer's storefront stays exactly where it was, and
`GET /widgets/:id` answers nothing at all for a widget that has never been
published.

**Rollback needs no operation of its own.** Every version is still stored, so
"go back to 3" and "ship 5" are `publishWidget` with a different number. That is
most of the argument for appending versions rather than overwriting them, and it
is why there is no `rollbackWidget` to go looking for.

**Unpublishing deletes nothing.** It sets the column to null: the id, the draft
and every version stay, `GET /widgets/:id` starts answering the same "no such
widget" it answers for an id that was never minted, and publishing a version
puts the same widget back on the same pages.

There is no `Status` column beside the two numbers, on purpose. "Is there an
unpublished draft" is `DraftVersion <> PublishedVersion`, "is it live" is
`PublishedVersion IS NOT NULL`, and two columns that can disagree about one fact
is how a row starts lying.

### Saving over somebody else's work

`saveWidget` takes an optional `expectedDraftVersion`: the version the studio
read the document at. If the draft has moved since, the save is refused with a
sentence saying so rather than writing over work nobody has seen. Passing
nothing skips the check, which is what a caller that never opened anything does.

It is a sentence rather than the schema's authorization message, because it is
not about permission: the answer to it is "look at what changed", not "ask for
access".

## The one public thing in this API

`GET /widgets/:widgetId` is the only endpoint in the product that answers without
a token, and it is a controller rather than a GraphQL field. Both of those are
deliberate.

**Why not GraphQL.** The caller is a copy of the SDK inside somebody else's web
page. There is no account, nothing to select, and the copy may be a year old. A
plain `GET` with a cacheable body is the right shape for that: it sits behind a
CDN, it needs no client library, and it does not add the first exception to
"nothing in the GraphQL schema answers without a token", which `app.test.ts`
enumerates and enforces. That rule is worth more than the consistency would have
been.

**What "public" means here, exactly.** The definition is published content. It is
served to a page anybody can open, by code that cannot hold a credential, and it
is cacheable for a minute. Nothing private may be put in a definition, and
[the schema documentation](../../../packages/widget-sdk/docs/widget-schema.md#what-a-definition-must-never-hold)
says so where an author will read it. The id is 32 hex characters of randomness,
which keeps definitions from being enumerable and is not authorization.

### The origin check

A widget's own document names the origins a browser may render it from, and this
endpoint enforces that list. It is **not** `CORS_ORIGINS`: that setting is the
list of our own front ends, and one list for the whole product is not an
allowlist, it is a list of everybody.

| The request                                | The answer                                |
| ------------------------------------------ | ----------------------------------------- |
| No `Origin` at all (curl, a server, a CDN) | The definition, with no CORS header on it |
| An `Origin` the document lists             | The definition, with that origin echoed   |
| Any other `Origin`                         | 403, with a sentence a developer can read |

Five things about that table are load-bearing:

**`Vary: Origin` is on every answer, including the refusals.** Without it a
shared cache can serve the copy it stored for one origin to a page on another,
which either leaks a widget past its allowlist or denies one that was on it. It
is the most important header on the route and the easiest to leave off.

**Never `*`, and never an origin that was not checked.** An echo with no check is
a star written the long way.

**Comparison is exact string equality.** No wildcards, no suffix matching:
`evil-northwind.test` ends with the same characters as `northwind.test`. Entries
are validated when the document is saved, so the comparison at read time can be
as dumb as it looks.

**A request with no `Origin` is served.** CORS is a rule browsers keep about
pages; a request with no browser in front of it was never subject to it.
Refusing those would break every CDN and server-side render while stopping
nobody, and what protects a definition from `curl` is that it is published
content reached by an unguessable id.

**The 403 both omits the header and says why.** The omission is what the browser
enforces; the status and the sentence are for the developer integrating the
widget, who otherwise gets an opaque "Failed to fetch" with nothing in it about
origins. Two readers, two mechanisms.

No preflight is involved: the SDK sends a `GET` with `Accept` and nothing else,
which is a simple request, so a browser never sends an `OPTIONS` here. An
endpoint that grows a custom request header will need the preflight answered by
the same rule as the request, and an `OPTIONS` that is permissive because it
looked cheap is the whole allowlist gone.

### The schema, served

`GET /widgets/schema` answers the JSON Schema itself, unauthenticated, cached for
an hour, with `Access-Control-Allow-Origin: *`. A customer writing a document by
hand wants it, an editor wants it for autocompletion, and the model that will
eventually write these documents wants it as its structured-output schema.
Serving it from the process that validates against it is what stops those three
from reading three different copies.

## Validation: the guardrail layer

Everything a document survives before it is stored, in
[`widgets.validation.ts`](../src/widgets/widgets.validation.ts):

```text
size → JSON Schema (Ajv) → tree shape → URLs → origins
```

It is a pipeline rather than one check because the questions are of different
kinds and a schema can only answer the first. What Ajv decides is shape: which
properties exist, their types, how long a string may be, which element types
there are. What it cannot decide is anything about the document as a whole, and
that is the walk: how deep the tree is, how many elements in total, whether two
share an id, whether a URL is one we will follow, whether an origin is exact.

**Every problem is reported, not the first.** A document that has to be submitted
once per mistake is a document nobody finishes, which is the same reason
`ZodPipe` reports the profile form all at once. The sentences are joined with
`"; "` into one `BadRequestException`, and **that separator is part of the
contract**: main-gui's studio splits on it to list the problems under the field.

**Ajv's paths are rewritten.** `/root/children/0/action/url` is precise and
nobody reads it; `root.children[0].action.url` is the same fact in the notation
the document is written in.

Two details worth knowing before changing the schema:

- **`discriminator: true`.** Ajv reads `type` first and checks only the branch
  the author meant, so a wrong property on a button is
  `root.children[0].label: must be string` rather than eight failures ending in
  "must match exactly one schema in oneOf".
- **`date-time` is ours.** `ajv-formats` carries the whole format vocabulary for
  the one keyword this schema names, and it is a CommonJS default export that
  neither this compiler nor Node agrees with the other about. Twelve lines
  replace it, and they say what the product means rather than what the standard
  does: **an offset is required**, because a local time with none is a different
  moment in every timezone a page is read in.

The schema itself is a TypeScript module rather than a `.json` file, and
[the file says why](../src/widgets/widget.schema.ts): `tsc` copies nothing but
`.ts` into `dist`, so a JSON file would have to be taught to the compiler and to
the Docker image for no gain, and what is gained instead is that the language can
be commented.

**Nothing is stored that has not been through this.** The checks run in
`WidgetsService.save`, which is the one path to the database, rather than in the
resolver: there is no way to reach the store that skips them.

## Storing it

Two tables. `dbo.Widgets` is the widget and its public id; `dbo.WidgetVersions`
holds one row per saved definition, in a `jsonb` column.

**Postgres rather than S3**, which was the other candidate. A read is one indexed
lookup by id, which is cheap enough that object storage buys nothing yet; it
needs no credentials this repository does not have; it works in the Compose stack
with no new service; and it makes versioning, listing and "whose is this" the
database's job rather than ours. If read volume ever justifies it, the published
definition can be mirrored to a CDN in front of this endpoint without the store
changing, which is the cheaper half of the S3 argument anyway.

**One `jsonb` column rather than a hundred columns.** The shape of a widget _is_
the product and it changes with every element added to the language; a column per
property would be a migration every time somebody wanted a new kind of banner.
What keeps the column honest is that nothing reaches it unvalidated.

**Versions are appended, never overwritten.** A widget is embedded by an id that
never changes, so an edit is a change to a live page: "make the button blue" has
to be a new row that can be looked at, compared and gone back from, rather than
an `UPDATE` over what is being served to customers right now. It matters more
once a model is the one making the edit, and it is what makes rollback a
publish rather than a restore.

The two version columns are numbers rather than foreign keys to
`dbo.WidgetVersions`, because a key would be circular: each table would name the
other, and the circle would have to be broken on every insert by writing a NULL
and coming back to it. `dbo.SaveWidget` and `dbo.PublishWidget` are the only
writers, and each writes its column in the same call as the row it names.

### The functions

| Function                  | Who calls it        | What is unusual about it                                      |
| ------------------------- | ------------------- | ------------------------------------------------------------- |
| `dbo.SaveWidget`          | `saveWidget`        | Mints the public id; refuses a save against a moved draft     |
| `dbo.PublishWidget`       | `publishWidget`     | Names the version; refuses one that was never written         |
| `dbo.UnpublishWidget`     | `unpublishWidget`   | Sets the column to null and deletes nothing                   |
| `dbo.GetWidget`           | the public endpoint | **Takes no login name at all**; answers the published version |
| `dbo.GetWidgetDefinition` | `widgetDefinition`  | The owner's read: will hand back an unpublished draft         |
| `dbo.GetWidgetVersions`   | `widgetVersions`    | The history; carries no definitions                           |
| `dbo.GetWidgets`          | `widgets`           | The list behind the studio; carries no definitions            |

The two reads are two functions rather than one with a flag, and the difference
is the point:

```text
dbo.GetWidget            the published version, to a browser, with no account
                         involved at all
dbo.GetWidgetDefinition  any version, to the person who owns it, so it can be
                         edited or compared
```

`dbo.GetWidget` is the only read in this schema that asks for no account,
because there is nobody to ask about. Everything else in `dbo` starts by
resolving a login.

`dbo.SaveWidget` does **not** validate the definition and must not start:
what a valid widget is has one authority, and a second opinion written in plpgsql
would be the one nobody remembers to update. What it does check is whether the
caller may write here, which is the question SQL is the right place for.

A widget that does not exist and a widget belonging to somebody else are refused
identically, with the schema's own authorization message. Answering differently
would confirm which ids are real, and the ids are the only thing keeping
definitions from being enumerated.

## The operations

```graphql
mutation SaveWidget(
  $name: String!
  $definition: String!
  $widgetId: String
  $expectedDraftVersion: Int
) {
  saveWidget(
    name: $name
    definition: $definition
    widgetId: $widgetId
    expectedDraftVersion: $expectedDraftVersion
  ) {
    WidgetId
    Name
    DraftVersion
    PublishedVersion
    UpdatedAt
  }
}
```

Behind the token like everything else in the schema. `widgetId` absent means
"make one"; present means "add a draft version to this one".

Beside it: `publishWidget(widgetId, version)` and `unpublishWidget(widgetId)`
decide what the world sees, `widgetDefinition(widgetId, version)` reads one back
with `version` absent meaning the draft, and `widgetVersions(widgetId)` is the
history.

**The definition is a `String` holding JSON rather than a structured input type.**
Describing the same shapes a second time in GraphQL would be a second authority
that disagreed with the schema by next month, and text is also exactly what the
author has in their hand: a JSON syntax error in it is then a sentence about the
character it broke at rather than "expected object, received string". It comes
back the same way, as the stored text, compact; the studio lays it out for its
box, because how JSON is arranged in a text area is a question about a text area.

Neither the save nor the list answers with a definition: the document is
kilobytes of JSON and both are read to draw a table of names.

## Configuration

Nothing new. The widget endpoint reads no setting of its own: the allowlist is in
each document, the limits are in the schema module, and the database is the one
this API already has.

`CORS_ORIGINS` is unchanged and still means "our own front ends". It does not
reach the widget route, which sets its own header per widget.

## What is not here yet

- **Comparing two versions.** The history says what there is and any version can
  be opened, but nothing diffs them, so "what changed in 4" is read by eye.
- **Scheduled publishing.** A version goes live when somebody presses the
  button. "Publish this at midnight" is a column and something that wakes up to
  read it, and the second half of that is the durable-event design this API does
  not have yet.
- **Analytics.** The SDK reports clicks to the host page and nothing reaches this
  API. A durable event path is its own design, and the API's
  [design decisions](design-decisions.md) already say what shape it should take.
- **Per-tenant keys and rate limiting.** A widget read is unauthenticated and
  uncounted. The origin allowlist stops another page spending a widget; it stops
  nothing coming from `curl`, and there is no per-tenant key to scope or throttle
  yet. See [docs/TODO.md](../../../docs/TODO.md).
- **A revisited cache time.** `max-age=60` is a guess at a product nobody is
  using. It wants real traffic before it means anything.

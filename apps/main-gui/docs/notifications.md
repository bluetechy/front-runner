# Notifications

The bell in the top bar, the panel behind it, and the page behind that. Lives
in `src/notifications`; the panel is mounted by `app-chrome/app-top-bar.tsx`
and the page is `/notifications`. It is the first thing in this app to read the
API through [TanStack Query](#tanstack-query).

**The panel and the page are the same list read two ways.** The panel is a
glance somebody takes with the page they were on still behind it; the page is
where they go to work through the whole thing. They share the hooks, the query
keys and therefore the cache, so a notification read in one is read in the
other without either being told.

Built from two supplied mock-ups. The first gave the panel its shape: a
colored heading, a scrolling list, a **Mark all read** control. The second
gave a row its face — the person who caused the notification, with the kind of
notification as a small disc on their shoulder.

Three deliberate departures from them. The amber **Mark All Read** pill is
white paper, because amber is not a color this product has and the heading it
sits on is already the accent. The per-row chevron is gone — see
[a row](#a-row). And the count on the bell is of **unread** notifications
rather than of all of them, which is what makes the badge disappear when
everything has been read.

## What is on the bell

`Badge` counts the unread ones and MUI drops a badge showing zero, so the dot
comes off the bell the moment the last one is read and comes back when the next
notification arrives. Over ninety-nine it reads `99+`.

**The count is its own query.** It is not the unread rows in what the panel is
holding, because the panel is holding one page of a list that may be long —
counting there would say six when the first twelve happen to contain six of
forty, and would change every time somebody switched the filter.
`notificationCounts` counts in the database and answers with all three numbers
at once: the badge takes `Unread`, the page puts all three beside its tabs, and
because it is one query under one key they cannot disagree.

## The panel

A `Popover`, not the `Menu` the flag and the account button use. It has a
heading, a scrolling list and a footer, and calling it a menu would promise
arrow-key movement between things that are not menu items. It is dressed like
those two regardless, because it hangs off the same bar: card paper, the
card's own hairline, and the panel shadow.

| Part    | What it is                                                                  |
| ------- | --------------------------------------------------------------------------- |
| Heading | the accent gradient, the count in words, and **Mark all read**              |
| Filter  | All · Unread · Read, which is a query and not a sieve over what was fetched |
| List    | a page at a time, newest first, scrolling at about four and a half rows     |
| Footer  | **View all**, which goes to `/notifications`                                |

**Mark all read grays out rather than disappearing** when nothing is unread.
The heading keeps its shape as the last row is read, and the control stays
where the person left it. Its disabled colors are the theme's `onAccent`
pair — this app already has an answer for ink on a surface painted in the
accent, which this heading still is even though the rail no longer is.

The footer goes to [the page](#the-page), which is the same list with room to
read it in.

Both buttons in the panel repeat their color under `&:hover`. The theme
paints a text button **white** on hover, which is right on the violet field
and invisible on card paper — **View all** vanished under the cursor until it
said otherwise. Any button this app puts on a card has to answer that.

### The filter

`notification-filter.tsx`. **All**, **Read**, **Unread**, in that order, from
`FILTERS` in `notifications-api` — written once, so the panel's strip and the
page's cannot drift apart.

It is an argument to the API, not a filter over what has already arrived. With
a paged list those are not the same thing: filtering in the browser would give
pages of a different size each time and an empty panel whenever the first
twelve happened to be all read. Each of the three is its own query key, so each
keeps its own pages and its own place in the list.

The theme dresses a toggle for the violet field — light violet ink, accent
gradient under the selected segment — and that ink is unreadable on card paper,
so this takes a shape of its own instead: the card's own hollow as the track,
and the chosen segment in white paper with the card's ink.

### When the list is not a list

Waiting, broken and empty all render the same centered sentence in the same
place, so the panel does not change shape between them. Empty says something
different under each filter, because "you have no notifications yet" under
Unread would be a lie told to somebody who has forty of them:

- **Waiting** — "Loading your notifications…"
- **Broken** — what the API said, or "Your notifications could not be loaded."
- **Empty** — "You have no notifications yet." / "Nothing unread." / "Nothing
  read yet."

## A row

A face, what happened, how long ago, and whether it has been read.

**The whole row is a button and clicking it marks the notification read.**
There is no chevron: the mock-up draws one, and it would point at a page that
does not exist. An affordance that lies is worse than one that is missing, so
the chevron comes back when a notification has somewhere to go.

**The read state is a mark down the right-hand edge**, so the eye runs down one
column instead of hunting for it in the text. Both states draw something — a
filled dot is unread, a hollow ring is read — so the column is never ambiguous
about whether it has an answer. A screen reader sees neither, so the row's
`aria-label` is the whole thing in one sentence: who, what, when, and read or
unread.

### The face

`ActorUUID` is who **caused** a notification, as against `UserUUID`, who is
being told. It is nullable because most of what this schema notifies on has
nobody behind it: a task falls overdue on its own, a level is reached by the
person being told, an update ships.

So the circle at the front of a row is one of two things:

- **Somebody caused it** — that person, drawn by `InitialsAvatar`, with the
  kind of notification as a small disc on the corner. The face answers _who_
  and the disc answers _what_, and neither has to be read to get the other.
- **Nobody did** — no face to draw, so the kind fills the circle instead.

There are no photographs in this product — the profile page says as much where
its camera button is — so a person is their initials on the button's gradient.
That was a private copy of the same six lines in `app-chrome` and in `profile`
until this wanted a third; it is `src/avatar` now, and the day an account can
carry a photograph, that is the one file that learns about it.

A notification with an actor is written as a phrase read **after** their name —
"Jane Doe **assigned you Build the API.**" — and the name is the only bold
thing in the row, so a list of them reads as a column of names with what each
one did beside it. A notification with no actor is a whole sentence.

### The disc

`notification-kinds.ts` maps `NotificationType` onto an icon and one of the
theme's `noticeTints`. The type is free text in the database rather than an
enum, because the list of things worth telling somebody grows with the
product — so the table has a fallback, and a type shipped by an API newer than
this bundle draws the bell itself on the quietest tint.

The tints are named for what a notification is _about_, not for a color, and
two types sharing one is the point: a badge and a level are both the program
rewarding you, and they look it.

| Tint       | Types                                                |
| ---------- | ---------------------------------------------------- |
| `task`     | `Assigned`                                           |
| `alert`    | `Overdue`, `ApprovalNeeded`, `Rejected`              |
| `reward`   | `BadgeEarned`, `LevelReached`                        |
| `commerce` | `OrderReceived`                                      |
| `message`  | `ReviewReceived`, `Mention`                          |
| `people`   | `Registrations`, `Welcome`                           |
| `general`  | `UpdateAvailable`, and anything this app has not met |

Every disc carries a white glyph on white paper, so every tint clears 3:1
against white — the floor for something drawn rather than written. That is why
the amber is `#c77b14` and not the mock-up's `#f5a623`, which is 2.0:1.

### "2 days ago"

`relative-time.ts`, over `Intl.RelativeTimeFormat` in the chosen language.
A table of strings in `locales/*.json` would mean translating a grammar rather
than a sentence, and every browser this app runs in has the API.

The unit is the largest one the gap fills, and it is **truncated rather than
rounded**: 23 hours is "23 hours ago", because "1 day ago" for something that
arrived this morning is wrong in the way somebody notices. Under a minute is
"now". A timestamp the browser cannot parse renders as nothing rather than as
"Invalid Date".

## The page

`notifications-page.tsx`, at `/notifications`. One card on the field, the way
every page behind the login is, with the heading and **Mark all read** outside
it and the list inside.

It has the panel's filter and the panel's paging — the same hooks, so nothing
is implemented twice — and spends the room a page has on the things the panel
cannot fit:

| On the page                   | Why not in the panel                                   |
| ----------------------------- | ------------------------------------------------------ |
| A chip saying what kind it is | 380px is not enough to put a chip beside a sentence    |
| A count beside each filter    | the panel already says the unread count in its heading |
| A larger face, at 48px        | room                                                   |
| An explicit **Mark as read**  | see below                                              |
| A bar down the left of unread | the mock-up's stripe, which needs a full-width row     |

**The row is not a button here, and it is in the panel.** That is deliberate
rather than drift. The panel is a quick action somebody opened on purpose,
where marking a notification read is the only thing to do and the target should
be the whole row. A page is somewhere to read, where rows are content and a
stray click should not quietly change something — so the action is a control of
its own, which is also what the mock-up draws. A read row keeps the space that
control occupied, so the list does not shift as rows are read.

The chip's words come from the same table the icon and the tint do. A type this
bundle has never met gets its name spaced out — `PointsExpiring` becomes "Points
expiring" — which is untranslated and legible, and better than an empty chip.

What the mock-up has and this does not: a settings gear, a per-row mute, and
"View discussion". None of them has anything behind it yet, and the rule is the
one the chevron got — an affordance that lies is worse than one that is
missing. The mock-up's "Show unread only" switch is the Unread tab, which is
the same thing said once.

## TanStack Query

`notifications-api.ts` is the first vertical to read the API through
`@tanstack/react-query`; `profile/` and `wallet/` still fetch in a `useEffect`
of their own. The bell is what made it worth the dependency: the panel is
opened and closed over and over, it pages as somebody scrolls, marking one
notification read has to move a count in the top bar as well as a row inside
the panel, and all of that is nearly free once there is a cache with one key
in it.

The client is made once in `main.tsx`, outside the router, with one retry —
a GraphQL error is usually a refused request rather than a flaky wire, and
retrying three times just makes the browser slower to say so. Every query is
`enabled` only when the session says signed-in, and holds for thirty seconds
before it is stale.

**Both mutations invalidate everything under the root key** rather than
patching a row into whichever pages happen to be cached. Marking one read
changes the badge and changes what Unread holds; refetching a few pages of
twelve costs less than a cache that is subtly wrong.

Neither mutation answers with the list any more. They did until the panel
started paging, at which point "here is everything" stopped being a useful
answer to a caller holding page three of it — `markNotificationRead` returns
the row that changed and `markAllNotificationsRead` returns how many rows it
marked.

### Paging, and why the scroll does not stop

`useInfiniteQuery` over `limit`/`offset`, which is what `users` and
`organizations` already do. A page is **twelve**, about three times what the
panel shows at once. A short page is the end of the list: asking for twelve and
getting nine means there is no thirteenth, so there is no total to keep and
none to get wrong.

The next page is asked for **before** anybody reaches the end. `MorePlease` is
a sentinel at the foot of the list watched by an `IntersectionObserver` with a
`rootMargin` of 220px — about three rows — so the observer counts it as visible
while it is still below the fold and the request goes out while the person is
still reading. By the time they scroll that far the rows are already there and
the list never stops under them. That is the whole trick behind a feed that
feels endless: the page before the one you need.

An observer is made only while there is a next page and nothing is in flight,
so a fast scroll cannot ask for the same page twice, and the sentinel is an
`output` element so a screen reader is told that more is coming. Where
`IntersectionObserver` does not exist — jsdom, and anything old enough — the
list simply ends at the first page rather than breaking.

The order is stable down to the tie-break, `CreatedAt` then the UUID, which is
what keeps a page boundary from showing one row twice and skipping another.
What offsets cannot do is stay correct if a notification arrives _while_
somebody is scrolling; the answer to that is the same as everywhere else, which
is that the next invalidation puts it right.

The GraphQL `fetch` in this file is a third copy of the one in `profile-api`
and `wallet-api`. That is deliberate rather than overlooked — those two are not
being rewritten here — and when the second vertical moves onto Query, the three
become one `graphql/` vertical. See
[codebase structure](codebase-structure.md#the-rules).

## What is behind it

| Piece                                              | Where                                             |
| -------------------------------------------------- | ------------------------------------------------- |
| `notifications(filter, limit, offset)`             | `apps/main-api/src/notifications`                 |
| `unreadNotificationCount`                          | the same, and its own query for the reason above  |
| `markNotificationRead`, `markAllNotificationsRead` | the same                                          |
| `dbo.GetNotifications` and the two writes          | `apps/main-db/sql/Functions`                      |
| The rows to look at it with                        | `apps/main-db/sql/Seeds/Dev/39_Notifications.sql` |

`ReadAt` is the whole of the read/unread question — null is unseen, a timestamp
is when it was seen — and there is no `IsRead` beside it, because one column
cannot disagree with itself.

The filter and the page are applied **around** `dbo.GetNotifications` in the
API rather than inside it, which is how `users` pages `dbo.GetUsers`: the
function stays the one place that says what a notification is and who may see
one. The three predicates the filter can become are keyed by the enum in the
service, so what reaches the database is one of exactly three strings written
there.

Sign in as **testuser** to see a full bell: thirty-three notifications, six of
them unread, sixteen with somebody behind them, running from twelve minutes old
to four weeks. That is enough to scroll, enough to page three times, and enough
for both ends of the relative clock.

Their `CreatedAt` is written relative to the moment of the seed run, so a
freshly seeded database has ages worth showing. Note the wrinkle that comes
with it: seeds upsert and the audit columns belong to the triggers, so
`make db-seed` over rows that already exist refreshes their message and leaves
their age where it was. After editing the ages in that file, use
`make db-reseed`.

## Tests

`npm test --workspace main-gui`, and `make db-test` for the three functions.

- `relative-time.test.ts` — the units, the truncation, and both languages.
- `notification-menu.test.tsx` — the count on the badge, the badge's absence at
  zero, the count being the API's rather than the page's, the actor's name and
  initials, the filter asking the API again, the three empty sentences, the
  grayed-out button, that a row marks itself read only while it is unread, and
  that the sentinel asks for the next page 220px early, once, and not at all
  once the last page has arrived. The API hooks are stubbed; the helpers beside
  them are real.
- `notifications-page.test.tsx` — what the page does that the panel does not:
  the chip, including for a kind it has never seen; the counted tabs; the
  actor's name and initials; that a click on the row marks nothing and the
  button does; and that a read row offers nothing to press.

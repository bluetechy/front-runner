# Notifications

The bell in the top bar, and the panel behind it. Lives in
`src/notifications`, is mounted by `app-chrome/app-top-bar.tsx`, and is the
first thing in this app to read the API through
[TanStack Query](#tanstack-query).

Built from a supplied mock-up of a notification menu, with three differences.
The mock-up's amber **Mark All Read** pill is white paper here, because amber
is not a colour this product has and the heading it sits on is already the
accent. Its per-row chevron is gone — see [the row](#a-row). And its count is
of **unread** notifications rather than of all of them, which is what makes the
badge disappear when everything has been read.

## What is on the bell

`Badge` counts the unread ones and MUI drops a badge showing zero, so the dot
comes off the bell the moment the last row is read and comes back when the
next notification arrives. Over ninety-nine it reads `99+`.

The count is of the whole list, not of a page of it: `dbo.GetNotifications`
takes an optional row limit and the API deliberately passes none, so a badge
saying 50 when there are 60 is not a thing that can happen. When the panel
grows a second page, the cap and a counted-server-side total arrive together.

## The panel

A `Popover`, not the `Menu` the flag and the account button use. It has a
heading, a scrolling list and a footer, and calling it a menu would promise
arrow-key movement between things that are not menu items. It is dressed like
those two regardless, because it hangs off the same bar: card paper, the
card's own hairline, and the panel shadow.

| Part    | What it is                                                                |
| ------- | ------------------------------------------------------------------------- |
| Heading | the accent gradient, the count in words, and **Mark all read**            |
| List    | every notification, newest first, scrolling at about four and a half rows |
| Footer  | **View all**, which goes to `/notifications`                              |

**Mark all read greys out rather than disappearing** when nothing is unread.
The heading keeps its shape as the last row is read, and the control stays
where the person left it. Its disabled colours are the rail's whites — this app
already has an answer for ink on a surface painted in the accent.

`/notifications` is a `ComingSoon` page. The footer links somewhere real, and
what is there is honest about not being built.

Both buttons in the panel repeat their colour under `&:hover`. The theme
paints a text button **white** on hover, which is right on the violet field
and invisible on card paper — **View all** vanished under the cursor until it
said otherwise. Any button this app puts on a card has to answer that.

### When the list is not a list

Waiting, broken and empty all render the same centred sentence in the same
place, so the panel does not change shape between them:

- **Waiting** — "Loading your notifications…"
- **Broken** — what the API said, or "Your notifications could not be loaded."
- **Empty** — "You have no notifications yet."

## A row

A disc with a glyph on it, the message, and how long ago it arrived.

**The whole row is a button and clicking it marks the notification read.**
There is no chevron: the mock-up draws one, and it would point at a page that
does not exist. An affordance that lies is worse than one that is missing, so
the chevron comes back when a notification has somewhere to go.

Unread is carried three ways, because each is for a different reader: the
tinted ground and the dot are for the eye, the weight of the text is for a
glance down the list, and the `aria-label` — "… — unread. Mark as read." — is
for a screen reader, which sees neither of the other two. Clicking a row that
is already read does nothing rather than rewriting when it was first seen.

### The disc

`notification-kinds.ts` maps `NotificationType` onto an icon and one of the
theme's `noticeTints`. The type is free text in the database rather than an
enum, because the list of things worth telling somebody grows with the
product — so the table has a fallback, and a type shipped by an API newer than
this bundle draws the bell itself on the quietest tint.

The tints are named for what a notification is _about_, not for a colour, and
two types sharing one is the point: a badge and a level are both the programme
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

## TanStack Query

`notifications-api.ts` is the first vertical to read the API through
`@tanstack/react-query`; `profile/` and `wallet/` still fetch in a `useEffect`
of their own. The bell is what made it worth the dependency: the panel is
opened and closed over and over, marking one notification read has to move a
count in the top bar as well as a row inside the panel, and both of those are
free once there is a cache with one key in it.

The client is made once in `main.tsx`, outside the router, with one retry —
a GraphQL error is usually a refused request rather than a flaky wire, and
retrying three times just makes the browser slower to say so. The query is
`enabled` only when the session says signed-in, and holds for thirty seconds
before it is stale.

**Both mutations answer with the whole list**, because both change what the
badge says, so each replaces the cached list rather than patching it and
nothing has to work out what else changed. The invalidation that follows is
the braces to that belt: another tab may have read something too.

The GraphQL `fetch` in this file is a third copy of the one in `profile-api`
and `wallet-api`. That is deliberate rather than overlooked — those two are not
being rewritten here — and when the second vertical moves onto Query, the three
become one `graphql/` vertical. See
[codebase structure](codebase-structure.md#the-rules).

## What is behind it

| Piece                                                               | Where                                             |
| ------------------------------------------------------------------- | ------------------------------------------------- |
| `notifications`, `markNotificationRead`, `markAllNotificationsRead` | `apps/main-api/src/notifications`                 |
| `dbo.GetNotifications` and the two writes                           | `apps/main-db/sql/Functions`                      |
| The rows to look at it with                                         | `apps/main-db/sql/Seeds/Dev/39_Notifications.sql` |

`ReadAt` is the whole of the read/unread question — null is unseen, a timestamp
is when it was seen — and there is no `IsRead` beside it, because one column
cannot disagree with itself.

Sign in as **testuser** to see a full bell: eight notifications, four of them
unread, the newest an hour old and the oldest a week. Their `CreatedAt` is
written relative to the moment of the seed run, so a freshly seeded database
has something for the relative clock to say.

## Tests

`npm test --workspace main-gui`.

- `relative-time.test.ts` — the units, the truncation, and both languages.
- `notification-menu.test.tsx` — the count on the badge, the badge's absence
  at zero, the three empty states, the greyed-out button, and that a row marks
  itself read only while it is unread. The API hooks are stubbed; the helpers
  beside them are real.

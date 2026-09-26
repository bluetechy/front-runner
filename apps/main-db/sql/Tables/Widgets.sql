--
-- A widget: something somebody publishes once and then embeds on a site they
-- may not be able to edit again.
--
-- "WidgetId" is the public name and the only one that leaves this database.
-- It is unguessable on purpose -- 'w_' and sixteen random bytes, minted by
-- dbo.SaveWidget -- because the endpoint that serves a definition to a
-- customer's page carries no token: a page anybody can open cannot present
-- one. So the id is what stands between "public to whoever was given it" and
-- "public to whoever counts", and "WidgetUUID" stays the internal key the way
-- it does on every other table here.
--
-- **Two version numbers, and the difference between them is the whole
-- lifecycle.** "DraftVersion" is the most recent save. "PublishedVersion" is
-- what a browser is served, and it is NULL until somebody publishes: saving is
-- not publishing, so a widget can be worked on for an afternoon while the
-- version on somebody's storefront stays exactly where it was.
--
-- Rollback needs no column of its own, which is why the pair is enough.
-- Publishing an earlier version *is* the rollback, because every version is
-- still here: dbo.PublishWidget takes a number and refuses one that does not
-- exist.
--
-- Both are numbers rather than foreign keys to dbo.WidgetVersions. A key would
-- be circular -- each table would name the other -- and the circle would have
-- to be broken on every insert by writing a NULL and coming back to it.
-- dbo.SaveWidget and dbo.PublishWidget are the only writers, and each writes
-- its column in the same statement as the row it names.
--
-- There is no "Status" column beside them. A status would be a second opinion
-- about a question these two already answer between them -- "is there an
-- unpublished draft" is `DraftVersion <> PublishedVersion`, and "is it live"
-- is `PublishedVersion IS NOT NULL` -- and two columns that can disagree about
-- the same fact is how a row starts lying.
--
CREATE TABLE "dbo"."Widgets" (
    "WidgetUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "WidgetId" varchar(34) NOT NULL UNIQUE,
    "UserUUID" uuid NOT NULL,
    "Name" varchar(200) NOT NULL,
    "DraftVersion" integer NOT NULL DEFAULT 0, -- 0 until the first save lands
    "PublishedVersion" integer, -- NULL until it is published; what browsers get
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

--
-- One saved definition. Widgets are versioned rather than overwritten, and
-- this is the table that makes that true.
--
-- The reason is not tidiness. A widget is embedded on somebody else's site by
-- an id that never changes, so an edit is a change to a live page: "make the
-- button blue" has to be a new row that can be looked at, compared and gone
-- back from, not an UPDATE over the thing currently being served to
-- customers. It matters more once a model is the one making the edit.
--
-- "Definition" is jsonb, and the reason it is one column rather than a
-- hundred is the same reason the schema exists: the shape of a widget is the
-- product and it changes with every element added to the language. A column
-- per property would be a migration every time somebody wanted a new kind of
-- banner. What keeps the column honest is that nothing is written here
-- without having passed the JSON Schema first -- see main-api's
-- widgets.validation.ts -- so the database stores a document it does not have
-- to interpret and does not pretend to validate.
--
-- "SchemaVersion" is lifted out of the document rather than left inside it,
-- so that "which of these were written against v1" is an index scan rather
-- than a read of every definition, on the day there is a v2 to migrate.
--
CREATE TABLE "dbo"."WidgetVersions" (
    "WidgetVersionUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "WidgetUUID" uuid NOT NULL,
    "Version" integer NOT NULL,
    "SchemaVersion" varchar(10) NOT NULL,
    "Definition" jsonb NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    -- One row per version of a widget. It is also what dbo.SaveWidget leans on
    -- to be safe under two saves at once: the second one fails this rather
    -- than quietly writing a second version 4.
    CONSTRAINT "UQ_WidgetVersions_WidgetUUID_Version" UNIQUE ("WidgetUUID", "Version")
);

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
-- "CurrentVersion" is the version number a browser is served, and it is a
-- number rather than a foreign key to dbo.WidgetVersions. A key would be
-- circular -- each table would name the other -- and the circle would have to
-- be broken on every insert by writing a NULL and coming back to it.
-- dbo.SaveWidget is the only thing that writes this column, and it writes it
-- in the same statement that adds the version it names.
--
-- There is no "Status" column and no draft. Saving publishes, which is the
-- whole of the lifecycle today; the draft/preview/publish ladder the
-- architecture calls for is a column here and a second read function, and it
-- is written down in docs/TODO.md rather than half-built.
--
CREATE TABLE "dbo"."Widgets" (
    "WidgetUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "WidgetId" varchar(34) NOT NULL UNIQUE,
    "UserUUID" uuid NOT NULL,
    "Name" varchar(200) NOT NULL,
    "CurrentVersion" integer NOT NULL DEFAULT 0, -- 0 until the first version lands
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

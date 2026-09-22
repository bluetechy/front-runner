CREATE TABLE "dbo"."Organizations" (
    "OrganizationUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "Name" varchar(64) NOT NULL,
    -- Where the organization is on the web. A website belongs to a company,
    -- not to one of its people, so it is held here and nowhere else.
    -- Nothing reads or writes it yet: no function returns it and no page
    -- offers it, which is deliberate -- the column is here so the value has
    -- one home the moment an organization page asks for it.
    "Website" varchar(255) NOT NULL DEFAULT '',
    "IsEnabled" boolean DEFAULT true,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

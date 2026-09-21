CREATE TABLE "dbo"."Badges" (
    "BadgeUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "OwnerUUID" uuid, -- (if applicable)
    "Name" varchar(64) NOT NULL,
    "Description" text NOT NULL,
    "IconUrl" varchar(255),
    "BadgeCategoryUUID" uuid,
    "Level" integer NOT NULL DEFAULT 1,
    "Rarity" varchar(20),
    "Value" integer,
    "ExpiresAt" TIMESTAMPTZ,
    "IsPublic" boolean,
    "IsEnabled" boolean NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "Badges_Level_UniqueKey" UNIQUE ("BadgeUUID", "Level")
);

CREATE TRIGGER "Badges_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Badges" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
CREATE TRIGGER "Badges_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Badges" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();

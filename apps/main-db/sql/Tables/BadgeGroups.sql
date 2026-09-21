CREATE TABLE "dbo"."BadgeGroups" (
    "BadgeGroupUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "Name" varchar(64) NOT NULL,
    "Description" text,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

CREATE TRIGGER "BadgeGroups_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."BadgeGroups" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
CREATE TRIGGER "BadgeGroups_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BadgeGroups" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();

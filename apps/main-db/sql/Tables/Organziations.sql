CREATE TABLE "dbo"."Organizations" (
    "OrganizationUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "Name" varchar(64) NOT NULL,
    "IsEnabled" boolean DEFAULT true,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

CREATE TRIGGER "Organizations_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Organizations" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
CREATE TRIGGER "Organizations_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Organizations" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();

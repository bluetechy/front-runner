CREATE TABLE "dbo"."UserOrganizations" (
    "UserUUID" uuid NOT NULL,
    "OrganizationUUID" uuid NOT NULL,
    "IsOwner" boolean NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "UserOrganizations_UUIDs_UniqueKey" UNIQUE ("UserUUID", "OrganizationUUID")
);

CREATE TRIGGER "UserOrganizations_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."UserOrganizations" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
CREATE TRIGGER "UserOrganizations_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."UserOrganizations" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();

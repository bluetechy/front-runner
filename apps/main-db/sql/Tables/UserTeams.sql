CREATE TABLE "dbo"."UserTeams" (
    "UserUUID" uuid NOT NULL,
    "TeamUUID" uuid NOT NULL,
    "IsManager" boolean NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "UserTeams_UUIDs_UniqueKey" UNIQUE ("UserUUID", "TeamUUID")
);

CREATE TRIGGER "UserTeams_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."UserTeams" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
CREATE TRIGGER "UserTeams_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."UserTeams" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();

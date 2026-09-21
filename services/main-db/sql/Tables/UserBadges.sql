CREATE TABLE "dbo"."UserBadges" (
    "UserUUID" uuid NOT NULL,
    "OrganizationUUID" uuid NOT NULL,
    "BadgeUUID" uuid NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "UserBadges_UUIDs_UniqueKey" UNIQUE ("UserUUID", "OrganizationUUID", "BadgeUUID")
);

CREATE TRIGGER "UserBadges_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."UserBadges" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
CREATE TRIGGER "UserBadges_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."UserBadges" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();

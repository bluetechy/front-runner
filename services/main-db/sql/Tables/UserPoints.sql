CREATE TABLE "dbo"."UserPoints" (
    "UserPointUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "UserUUID" uuid NOT NULL,
    "OrganizationUUID" uuid NOT NULL,
    "PointUUID" uuid NOT NULL,
    "Description" text NOT NULL,
    "Amount" decimal(19,4) NOT NULL,
    "ExpiresAt" TIMESTAMPTZ,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(20) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

CREATE TRIGGER "UserPoints_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."UserPoints" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
CREATE TRIGGER "UserPoints_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."UserPoints" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();

CREATE FUNCTION calculate_tallies() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "dbo"."UserTallies" ("UserUUID", "OrganizationUUID", "PointUUID", "Amount", "UpdatedBy") VALUES(NEW."UserUUID", NEW."OrganizationUUID", NEW."PointUUID", 0.00, NEW."CreatedBy") ON CONFLICT ("UserUUID", "OrganizationUUID", "PointUUID") DO NOTHING;
    UPDATE "dbo"."UserTallies" SET "Amount" = (SELECT SUM("Amount") FROM "dbo"."UserPoints" WHERE "UserUUID" = NEW."UserUUID" AND "OrganizationUUID" = NEW."OrganizationUUID" AND "PointUUID" = NEW."PointUUID" AND ("ExpiresAt" IS NULL OR "ExpiresAt" >= now())), "UpdatedBy" = NEW."UpdatedBy";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "UserPoints_UserTallies_Insert" AFTER INSERT ON "dbo"."UserPoints" FOR EACH ROW EXECUTE PROCEDURE calculate_tallies();
CREATE TRIGGER "UserPoints_UserTallies_Update" AFTER UPDATE ON "dbo"."UserPoints" FOR EACH ROW EXECUTE PROCEDURE calculate_tallies();

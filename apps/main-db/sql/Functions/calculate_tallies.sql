-- snake_case on purpose: trigger plumbing, not app-facing API. See SCHEMA-NOTES.md.
CREATE FUNCTION "dbo"."calculate_tallies" () RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "dbo"."UserTallies" ("UserUUID", "OrganizationUUID", "PointUUID", "Amount", "UpdatedBy") VALUES(NEW."UserUUID", NEW."OrganizationUUID", NEW."PointUUID", 0.00, NEW."CreatedBy") ON CONFLICT ("UserUUID", "OrganizationUUID", "PointUUID") DO NOTHING;
    UPDATE "dbo"."UserTallies" SET "Amount" = (SELECT SUM("Amount") FROM "dbo"."UserPoints" WHERE "UserUUID" = NEW."UserUUID" AND "OrganizationUUID" = NEW."OrganizationUUID" AND "PointUUID" = NEW."PointUUID" AND ("ExpiresAt" IS NULL OR "ExpiresAt" >= now())), "UpdatedBy" = NEW."UpdatedBy"
    WHERE "UserTallies"."UserUUID" = NEW."UserUUID" AND "UserTallies"."OrganizationUUID" = NEW."OrganizationUUID" AND "UserTallies"."PointUUID" = NEW."PointUUID";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

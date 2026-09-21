CREATE TABLE "dbo"."Points" (
    "PointUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "Name" varchar(64) NOT NULL,
    "Description" text NOT NULL,
    "CalculationFrequency" varchar(8) NOT NULL DEFAULT '*/1',
    "IsEnabled" boolean NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

CREATE TRIGGER "Points_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Points" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
CREATE TRIGGER "Points_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Points" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();

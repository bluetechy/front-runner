CREATE TABLE "dbo"."BadgeEventCriteria" (
    "BadgeEventCriteriaUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "BadgeEventUUID" INT REFERENCES BadgeEvents("BadgeEventUUID"),
    "BadgeUUID" uuid REFERENCES Badges("BadgeUUID"),
    "Description" TEXT NOT NULL,
    "BadgeType" VARCHAR(50) NOT NULL, -- Type of criteria (e.g., 'Activity', 'Achievement')
    "Value" INT NOT NULL, -- Value required for criteria completion
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

CREATE TRIGGER "BadgeEventCriteria_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."BadgeEventCriteria" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
CREATE TRIGGER "BadgeEventCriteria_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BadgeEventCriteria" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();

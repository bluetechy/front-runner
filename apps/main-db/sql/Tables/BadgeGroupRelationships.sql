CREATE TABLE "dbo"."BadgeGroupRelationships" (
    "BadgeGroupRelationshipUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "BadgeUUID" uuid REFERENCES Badges("BadgeUUID"),
    "BadgeGroupUUID" uuid REFERENCES BadgeGroups("BadgeGroupUUID"),
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

CREATE TRIGGER "BadgeGroupRelationships_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."BadgeGroupRelationships" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
CREATE TRIGGER "BadgeGroupRelationships_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BadgeGroupRelationships" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();

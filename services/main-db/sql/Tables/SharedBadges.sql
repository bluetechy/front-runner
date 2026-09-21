CREATE TABLE "dbo"."SharedBadges" (
    "SharedBadgeUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "UserUUID" INT REFERENCES Users("UserUUID"),
    "BadgeUUID" uuid REFERENCES Badges("BadgeUUID"),
    "SharedWithUserUUID" INT REFERENCES Users("UserUUID"),
    "SharedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER "SharedBadges_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."SharedBadges" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
CREATE TRIGGER "SharedBadges_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."SharedBadges" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();

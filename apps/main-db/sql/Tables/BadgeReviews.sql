CREATE TABLE "dbo"."BadgeReviews" (
    "BadgeReviewUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "BadgeUUID" uuid REFERENCES Badges("BadgeUUID"),
    "UserUUID" uuid REFERENCES Users("UserUUID"),
    "Status" VARCHAR(20) NOT NULL, -- 'Pending', 'Approved', 'Rejected', etc.
    "Comment" TEXT, -- Comments or feedback from the reviewer
    "ReviewedAt" TIMESTAMPTZ DEFAULT NOW(),
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

CREATE TRIGGER "BadgeReviews_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."BadgeReviews" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
CREATE TRIGGER "BadgeReviews_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BadgeReviews" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();

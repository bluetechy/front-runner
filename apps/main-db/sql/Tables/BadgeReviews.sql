CREATE TABLE "dbo"."BadgeReviews" (
    "BadgeReviewUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "BadgeUUID" uuid,
    "UserUUID" uuid,
    "Status" VARCHAR(20) NOT NULL, -- 'Pending', 'Approved', 'Rejected', etc.
    "Comment" TEXT, -- Comments or feedback from the reviewer
    "ReviewedAt" TIMESTAMPTZ DEFAULT NOW(),
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

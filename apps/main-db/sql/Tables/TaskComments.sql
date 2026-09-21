CREATE TABLE "dbo"."TaskComments" (
    "TaskCommentUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "TaskUUID" uuid NOT NULL,
    "UserUUID" uuid NOT NULL,
    "Comment" text NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

--
-- A file hanging off a task or off a comment, never both and never neither.
-- The draft left both columns nullable with nothing saying so; the check is
-- the same device dbo.ApprovalRequests uses for its subject.
--
-- A comment already belongs to a task, so an attachment on a comment reaches
-- the task through it rather than naming it twice.
--
CREATE TABLE "dbo"."Attachments" (
    "AttachmentUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "TaskUUID" uuid,
    "TaskCommentUUID" uuid,
    "FileName" varchar(255) NOT NULL,
    "FilePath" varchar(1024) NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "Attachments_OneOwner_Check" CHECK (
        num_nonnulls("TaskUUID", "TaskCommentUUID") = 1
    )
);

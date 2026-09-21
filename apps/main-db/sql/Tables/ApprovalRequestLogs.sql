--
-- Stage transitions, from the drafts' ApprovalProcessLogs. Both ends are
-- nullable: a request entering its first stage has no From, and one leaving the
-- last has no To. Like dbo.TaskHistory, nothing writes this automatically.
--
CREATE TABLE "dbo"."ApprovalRequestLogs" (
    "ApprovalRequestLogUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "ApprovalRequestUUID" uuid NOT NULL,
    "FromStageUUID" uuid, -- NULL when the request is entering its first stage
    "ToStageUUID" uuid, -- NULL when it is leaving the last one
    "Comment" text,
    "LoggedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

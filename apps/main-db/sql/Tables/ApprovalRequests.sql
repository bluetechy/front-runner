--
-- A running instance of a workflow: one thing, working its way through the
-- stages. "CurrentStageUUID" is NULL once the request has left the last stage,
-- which is what "finished" looks like -- read "Status" for the outcome.
--
-- WHAT IS BEING APPROVED. The draft had TaskId plus an untyped "ItemId", which
-- carried no integrity at all. Each subject gets its own nullable foreign key
-- instead, with a check that exactly one is set. Adding a fourth approvable
-- thing means a column and a line in the check -- cheap here, because schema
-- changes are edits and there are no migrations.
--
-- dbo.UserBadges is deliberately not among them: it has no single-column key to
-- point at, only the composite unique. Badge awards already have their own
-- approval path in dbo.BadgeReviews -- see SCHEMA-NOTES.md.
--
CREATE TABLE "dbo"."ApprovalRequests" (
    "ApprovalRequestUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "OrganizationUUID" uuid NOT NULL,
    "ApprovalWorkflowUUID" uuid NOT NULL,
    "CurrentStageUUID" uuid, -- NULL once the request is out of the stages
    "RequestedByUserUUID" uuid NOT NULL,
    "RequestText" text NOT NULL,
    "Status" varchar(20) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Cancelled'

    -- Exactly one of these is set. See the check below.
    "TaskUUID" uuid,
    "PointRedemptionUUID" uuid,
    "PointTransferUUID" uuid,

    -- Escalation. The drafts have three objects that escalate a step and
    -- nowhere to put the result; this is that place.
    "EscalatedToUserUUID" uuid,
    "EscalatedAt" TIMESTAMPTZ,
    "EscalationReason" text,

    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "ApprovalRequests_OneSubject_Check" CHECK (
        num_nonnulls("TaskUUID", "PointRedemptionUUID", "PointTransferUUID") = 1
    )
);

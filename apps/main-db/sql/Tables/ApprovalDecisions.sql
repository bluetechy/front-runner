--
-- One approver's answer at one stage. This is the half of the drafts'
-- ApprovalProcessSteps that belongs to a request rather than to a template:
-- Completed, ApprovalStatus, ApprovalComments and CompletionTimestamp.
--
-- Nothing here advances dbo.ApprovalRequests. Recording a decision and moving a
-- request to the next stage are two separate writes.
--
CREATE TABLE "dbo"."ApprovalDecisions" (
    "ApprovalDecisionUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "ApprovalRequestUUID" uuid NOT NULL,
    "ApprovalWorkflowStageUUID" uuid NOT NULL, -- the stage it was made at
    "ApproverUserUUID" uuid NOT NULL,
    "Status" varchar(20) NOT NULL, -- 'Approved' or 'Rejected'
    "Comment" text,
    "DecidedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "ApprovalDecisions_UUIDs_UniqueKey" UNIQUE ("ApprovalRequestUUID", "ApprovalWorkflowStageUUID", "ApproverUserUUID")
);

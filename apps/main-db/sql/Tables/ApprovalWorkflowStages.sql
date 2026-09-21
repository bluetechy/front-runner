--
-- The ordered steps of a workflow. The draft version was a flat list with no
-- parent and no order; both come from ApprovalProcessSteps, which mixed these
-- template columns in with the per-request ones now in dbo.ApprovalDecisions.
--
CREATE TABLE "dbo"."ApprovalWorkflowStages" (
    "ApprovalWorkflowStageUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "ApprovalWorkflowUUID" uuid NOT NULL,
    "Name" varchar(64) NOT NULL,
    "Description" text,
    "SortOrder" integer NOT NULL DEFAULT 0, -- the order a request passes through them
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "ApprovalWorkflowStages_NameAndWorkflow_UniqueKey" UNIQUE ("ApprovalWorkflowUUID", "Name")
);

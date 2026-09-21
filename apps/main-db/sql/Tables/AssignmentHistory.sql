--
-- Who a task moved between. Both ends are nullable: the first assignment has
-- no previous holder, and unassigning has no new one.
--
CREATE TABLE "dbo"."AssignmentHistory" (
    "AssignmentHistoryUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "TaskUUID" uuid NOT NULL,
    "PreviousUserUUID" uuid, -- NULL on the first assignment
    "NewUserUUID" uuid, -- NULL when the task is being unassigned
    "AssignedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

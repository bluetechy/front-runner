--
-- The union of the drafts' two task models. Tables/Tasks.sql had Title,
-- Status and AssignedUserId; the functions all read a RoadmapWorkflowTasks
-- that was never drafted, with Name, a Completed boolean, AssignedTo and
-- TaskOrder. Status wins over Completed -- it says the same thing and more,
-- and it is what BadgeReviews, PointRedemptions and PointTransfers already
-- use. "Priority" and "Category" come from stubs that filter on them
-- (GetTasksByPriority, GetTasksByCategory) against neither table.
--
-- "RoadmapUUID" is nullable: a task does not have to belong to a roadmap, so
-- the organization is carried here rather than reached through one.
--
-- The draft also gave Tasks a "DependencyId" pointing at TaskDependencies
-- while TaskDependencies pointed back at Tasks twice. That is dropped --
-- dbo.TaskDependencies is the whole relation.
--
CREATE TABLE "dbo"."Tasks" (
    "TaskUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "OrganizationUUID" uuid NOT NULL,
    "RoadmapUUID" uuid,
    "Name" varchar(64) NOT NULL,
    "Description" text,
    "Category" varchar(64),
    "Priority" integer NOT NULL DEFAULT 0, -- higher sorts first
    "Status" varchar(20) NOT NULL DEFAULT 'Pending', -- 'Pending', 'InProgress', 'Completed', 'Cancelled'
    "SortOrder" integer NOT NULL DEFAULT 0, -- manual ordering within a roadmap
    "DueDate" date,
    "AssignedUserUUID" uuid, -- NULL while unassigned
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

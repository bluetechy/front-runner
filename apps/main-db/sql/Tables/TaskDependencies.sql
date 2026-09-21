--
-- "DependentTaskUUID cannot start until PrerequisiteTaskUUID is done." Nothing
-- enforces that, and nothing rejects a cycle -- both belong to whatever moves
-- a task's status.
--
CREATE TABLE "dbo"."TaskDependencies" (
    "TaskDependencyUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "DependentTaskUUID" uuid NOT NULL,
    "PrerequisiteTaskUUID" uuid NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "TaskDependencies_UUIDs_UniqueKey" UNIQUE ("DependentTaskUUID", "PrerequisiteTaskUUID")
);

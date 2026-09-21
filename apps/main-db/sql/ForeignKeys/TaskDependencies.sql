-- Both columns are qualified, as on dbo.PointTransfers: neither is the plain
-- "TaskUUID" that would make "FK_TaskDependencies_Tasks" mean anything.
ALTER TABLE "dbo"."TaskDependencies" ADD CONSTRAINT "FK_TaskDependencies_Tasks_DependentTaskUUID" FOREIGN KEY ("DependentTaskUUID") REFERENCES "dbo"."Tasks" ("TaskUUID");
ALTER TABLE "dbo"."TaskDependencies" ADD CONSTRAINT "FK_TaskDependencies_Tasks_PrerequisiteTaskUUID" FOREIGN KEY ("PrerequisiteTaskUUID") REFERENCES "dbo"."Tasks" ("TaskUUID");

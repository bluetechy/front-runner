-- Two foreign keys to the stage table, both qualified.
ALTER TABLE "dbo"."ApprovalRequestLogs" ADD CONSTRAINT "FK_ApprovalRequestLogs_ApprovalRequests" FOREIGN KEY ("ApprovalRequestUUID") REFERENCES "dbo"."ApprovalRequests" ("ApprovalRequestUUID");
ALTER TABLE "dbo"."ApprovalRequestLogs" ADD CONSTRAINT "FK_ApprovalRequestLogs_Stages_FromStageUUID" FOREIGN KEY ("FromStageUUID") REFERENCES "dbo"."ApprovalWorkflowStages" ("ApprovalWorkflowStageUUID");
ALTER TABLE "dbo"."ApprovalRequestLogs" ADD CONSTRAINT "FK_ApprovalRequestLogs_Stages_ToStageUUID" FOREIGN KEY ("ToStageUUID") REFERENCES "dbo"."ApprovalWorkflowStages" ("ApprovalWorkflowStageUUID");

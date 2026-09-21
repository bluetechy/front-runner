ALTER TABLE "dbo"."ApprovalDecisions" ADD CONSTRAINT "FK_ApprovalDecisions_ApprovalRequests" FOREIGN KEY ("ApprovalRequestUUID") REFERENCES "dbo"."ApprovalRequests" ("ApprovalRequestUUID");
ALTER TABLE "dbo"."ApprovalDecisions" ADD CONSTRAINT "FK_ApprovalDecisions_ApprovalWorkflowStages" FOREIGN KEY ("ApprovalWorkflowStageUUID") REFERENCES "dbo"."ApprovalWorkflowStages" ("ApprovalWorkflowStageUUID");
ALTER TABLE "dbo"."ApprovalDecisions" ADD CONSTRAINT "FK_ApprovalDecisions_Users" FOREIGN KEY ("ApproverUserUUID") REFERENCES "dbo"."Users" ("UserUUID");

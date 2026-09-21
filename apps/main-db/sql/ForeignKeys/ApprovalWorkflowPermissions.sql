ALTER TABLE "dbo"."ApprovalWorkflowPermissions" ADD CONSTRAINT "FK_ApprovalWorkflowPermissions_ApprovalWorkflowStages" FOREIGN KEY ("ApprovalWorkflowStageUUID") REFERENCES "dbo"."ApprovalWorkflowStages" ("ApprovalWorkflowStageUUID");
ALTER TABLE "dbo"."ApprovalWorkflowPermissions" ADD CONSTRAINT "FK_ApprovalWorkflowPermissions_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");

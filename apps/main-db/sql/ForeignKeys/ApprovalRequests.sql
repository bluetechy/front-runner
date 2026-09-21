-- Two foreign keys to Users, both qualified: neither is a plain "UserUUID".
-- The three subject keys are nullable and exactly one is set per row -- the
-- check lives on the table.
ALTER TABLE "dbo"."ApprovalRequests" ADD CONSTRAINT "FK_ApprovalRequests_Organizations" FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
ALTER TABLE "dbo"."ApprovalRequests" ADD CONSTRAINT "FK_ApprovalRequests_ApprovalWorkflows" FOREIGN KEY ("ApprovalWorkflowUUID") REFERENCES "dbo"."ApprovalWorkflows" ("ApprovalWorkflowUUID");
ALTER TABLE "dbo"."ApprovalRequests" ADD CONSTRAINT "FK_ApprovalRequests_ApprovalWorkflowStages" FOREIGN KEY ("CurrentStageUUID") REFERENCES "dbo"."ApprovalWorkflowStages" ("ApprovalWorkflowStageUUID");
ALTER TABLE "dbo"."ApprovalRequests" ADD CONSTRAINT "FK_ApprovalRequests_Users_RequestedByUserUUID" FOREIGN KEY ("RequestedByUserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."ApprovalRequests" ADD CONSTRAINT "FK_ApprovalRequests_Users_EscalatedToUserUUID" FOREIGN KEY ("EscalatedToUserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."ApprovalRequests" ADD CONSTRAINT "FK_ApprovalRequests_Tasks" FOREIGN KEY ("TaskUUID") REFERENCES "dbo"."Tasks" ("TaskUUID");
ALTER TABLE "dbo"."ApprovalRequests" ADD CONSTRAINT "FK_ApprovalRequests_PointRedemptions" FOREIGN KEY ("PointRedemptionUUID") REFERENCES "dbo"."PointRedemptions" ("PointRedemptionUUID");
ALTER TABLE "dbo"."ApprovalRequests" ADD CONSTRAINT "FK_ApprovalRequests_PointTransfers" FOREIGN KEY ("PointTransferUUID") REFERENCES "dbo"."PointTransfers" ("PointTransferUUID");

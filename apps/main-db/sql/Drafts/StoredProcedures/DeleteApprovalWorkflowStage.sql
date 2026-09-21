CREATE OR REPLACE PROCEDURE DeleteApprovalWorkflowStage(StageId INT)
AS $$
BEGIN
    DELETE FROM ApprovalWorkflowStages WHERE StageId = StageId;
END;
$$ LANGUAGE plpgsql;

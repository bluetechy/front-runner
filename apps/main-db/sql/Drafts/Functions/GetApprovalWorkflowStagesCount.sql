CREATE OR REPLACE FUNCTION GetApprovalWorkflowStagesCount()
    RETURNS INT
AS $$
DECLARE
    StageCount INT;
BEGIN
    SELECT COUNT(*) INTO StageCount
    FROM ApprovalWorkflowStages;
    RETURN StageCount;
END;
$$ LANGUAGE plpgsql;

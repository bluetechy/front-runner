CREATE OR REPLACE FUNCTION GetApprovalWorkflowStageById(StageId INT)
    RETURNS TABLE (
                      StageName VARCHAR(50),
                      Description TEXT,
                      CreatedAt TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT StageName, Description, CreatedAt
        FROM ApprovalWorkflowStages
        WHERE StageId = StageId;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION GetApprovalWorkflowStages()
    RETURNS TABLE (
                      StageId INT,
                      StageName VARCHAR(50),
                      Description TEXT,
                      CreatedAt TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT StageId, StageName, Description, CreatedAt
        FROM ApprovalWorkflowStages;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION GetApprovalStagesCreatedAfter(DateCreated TIMESTAMPTZ)
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
        FROM ApprovalWorkflowStages
        WHERE CreatedAt > DateCreated;
END;
$$ LANGUAGE plpgsql;

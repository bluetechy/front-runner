CREATE OR REPLACE FUNCTION GetApprovalStagesModifiedAfter(DateModified TIMESTAMPTZ)
    RETURNS TABLE (
                      StageId INT,
                      StageName VARCHAR(50),
                      Description TEXT,
                      CreatedAt TIMESTAMPTZ,
                      ModifiedAt TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT StageId, StageName, Description, CreatedAt, ModifiedAt
        FROM ApprovalWorkflowStages
        WHERE ModifiedAt > DateModified;
END;
$$ LANGUAGE plpgsql;

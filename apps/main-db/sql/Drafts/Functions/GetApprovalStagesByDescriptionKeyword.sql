CREATE OR REPLACE FUNCTION GetApprovalStagesByDescriptionKeyword(Keyword TEXT)
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
        WHERE Description ILIKE '%' || Keyword || '%';
END;
$$ LANGUAGE plpgsql;

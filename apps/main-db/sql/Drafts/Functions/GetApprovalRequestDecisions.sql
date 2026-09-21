CREATE OR REPLACE FUNCTION GetApprovalRequestDecisions(RequestId INT)
    RETURNS TABLE (
                      DecisionId INT,
                      ApproverId INT,
                      DecisionText TEXT,
                      DecisionStatus VARCHAR(20),
                      CreatedAt TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT DecisionId, ApproverId, DecisionText, DecisionStatus, CreatedAt
        FROM ApprovalDecisions
        WHERE RequestId = RequestId;
END;
$$ LANGUAGE plpgsql;

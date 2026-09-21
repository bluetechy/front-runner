CREATE OR REPLACE FUNCTION GetApprovalRequestsByStage(StageId INT)
    RETURNS TABLE (
                      RequestId INT,
                      UserId INT,
                      TaskId INT,
                      ItemId INT,
                      RequestText TEXT,
                      Status VARCHAR(20),
                      CreatedAt TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT RequestId, UserId, TaskId, ItemId, RequestText, Status, CreatedAt
        FROM ApprovalRequests
        WHERE StageId = StageId;
END;
$$ LANGUAGE plpgsql;

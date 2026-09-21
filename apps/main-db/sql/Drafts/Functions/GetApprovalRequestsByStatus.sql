CREATE OR REPLACE FUNCTION GetApprovalRequestsByStatus(Status VARCHAR(20))
    RETURNS TABLE (
                      RequestId INT,
                      UserId INT,
                      TaskId INT,
                      ItemId INT,
                      StageId INT,
                      RequestText TEXT,
                      CreatedAt TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT RequestId, UserId, TaskId, ItemId, StageId, RequestText, CreatedAt
        FROM ApprovalRequests
        WHERE Status = Status;
END;
$$ LANGUAGE plpgsql;

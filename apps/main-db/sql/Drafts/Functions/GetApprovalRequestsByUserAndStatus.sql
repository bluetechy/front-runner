CREATE OR REPLACE FUNCTION GetApprovalRequestsByUserAndStatus(UserId INT, Status VARCHAR(20))
    RETURNS TABLE (
                      RequestId INT,
                      TaskId INT,
                      ItemId INT,
                      StageId INT,
                      RequestText TEXT,
                      CreatedAt TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT RequestId, TaskId, ItemId, StageId, RequestText, CreatedAt
        FROM ApprovalRequests
        WHERE UserId = UserId AND Status = Status;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION GetApprovalRequestsByUser(UserId INT)
    RETURNS TABLE (
                      RequestId INT,
                      TaskId INT,
                      ItemId INT,
                      StageId INT,
                      RequestText TEXT,
                      Status VARCHAR(20),
                      CreatedAt TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT RequestId, TaskId, ItemId, StageId, RequestText, Status, CreatedAt
        FROM ApprovalRequests
        WHERE UserId = UserId;
END;
$$ LANGUAGE plpgsql;

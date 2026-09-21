CREATE OR REPLACE PROCEDURE CreateApprovalRequest(
    UserId INT,
    TaskId INT,
    ItemId INT,
    StageId INT,
    RequestText TEXT
)
AS $$
BEGIN
    INSERT INTO ApprovalRequests (UserId, TaskId, ItemId, StageId, RequestText)
    VALUES (UserId, TaskId, ItemId, StageId, RequestText);
END;
$$ LANGUAGE plpgsql;

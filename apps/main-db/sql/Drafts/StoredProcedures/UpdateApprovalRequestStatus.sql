CREATE OR REPLACE PROCEDURE UpdateApprovalRequestStatus(
    RequestId INT,
    NewStatus VARCHAR(20)
)
AS $$
BEGIN
    UPDATE ApprovalRequests
    SET Status = NewStatus
    WHERE RequestId = RequestId;
END;
$$ LANGUAGE plpgsql;

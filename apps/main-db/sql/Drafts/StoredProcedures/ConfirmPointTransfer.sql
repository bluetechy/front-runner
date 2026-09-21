CREATE OR REPLACE PROCEDURE ConfirmPointTransfer(RequestId INT)
AS $$
BEGIN
    -- Get the request details
    DECLARE RequestRecord RECORD;
    SELECT * INTO RequestRecord FROM PointTransferRequests WHERE TransferRequestId = RequestId;

    IF RequestRecord.Status = 'Pending' THEN
    -- Deduct points from sender
    UPDATE UserPointTotals
    SET Points = Points - RequestRecord.Points
        WHERE UserId = RequestRecord.SenderId;

    -- Add points to receiver
    UPDATE UserPointTotals
    SET Points = Points + RequestRecord.Points
        WHERE UserId = RequestRecord.ReceiverId;

    -- Update request status
    UPDATE PointTransferRequests
    SET Status = 'Completed'
        WHERE TransferRequestId = RequestId;
    END IF;
    END;
$$ LANGUAGE plpgsql;

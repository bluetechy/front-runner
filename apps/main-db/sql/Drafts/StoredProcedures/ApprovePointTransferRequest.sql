CREATE OR REPLACE PROCEDURE ApprovePointTransferRequest(TransferRequestId INT, Approved BOOLEAN)
AS $$
BEGIN
    IF Approved THEN
        -- Process the point transfer and update the request status
        -- Add logic to handle the approval action here.
    ELSE
        -- Reject the point transfer request
        DELETE FROM PointTransferRequests WHERE TransferRequestId = TransferRequestId;
    END IF;
END;
$$ LANGUAGE plpgsql;

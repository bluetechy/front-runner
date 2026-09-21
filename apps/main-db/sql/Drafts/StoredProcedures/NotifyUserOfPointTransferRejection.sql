CREATE OR REPLACE PROCEDURE NotifyUserOfPointTransferRejection(UserId INT, TransferRequestId INT)
AS $$
DECLARE
    RejectionReason TEXT;
BEGIN
    -- Retrieve the rejection reason from the point transfer request
    SELECT TransferRejectionReason INTO RejectionReason
    FROM PointTransferRequests
    WHERE TransferRequestId = TransferRequestId;

    -- Implement your notification logic here, including sending the rejection reason.
END;
$$ LANGUAGE plpgsql;

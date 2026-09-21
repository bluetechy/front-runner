CREATE OR REPLACE PROCEDURE CancelPointTransferRequest(TransferRequestId INT)
AS $$
BEGIN
    DELETE FROM PointTransferRequests
    WHERE TransferRequestId = TransferRequestId;
END;
$$ LANGUAGE plpgsql;

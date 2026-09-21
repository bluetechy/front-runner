CREATE OR REPLACE PROCEDURE RequestPointTransfer(SenderId INT, ReceiverId INT, Points INT, Reason TEXT, Details JSONB)
AS $$
BEGIN
    -- Insert a request record
    INSERT INTO PointTransferRequests (SenderId, ReceiverId, Points, TransferReason, TransferDetails, Status)
    VALUES (SenderId, ReceiverId, Points, Reason, Details, 'Pending');
END;
$$ LANGUAGE plpgsql;

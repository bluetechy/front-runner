CREATE OR REPLACE PROCEDURE BulkTransferPoints(SenderId INT, RecipientIds INT[], Points INT, TransferReason TEXT)
AS $$
BEGIN
    FOREACH RecipientId IN ARRAY RecipientIds
        LOOP
            INSERT INTO PointTransfers (SenderId, ReceiverId, PointsChange, TransactionReason)
            VALUES (SenderId, RecipientId, Points, TransferReason);
        END LOOP;
END;
$$ LANGUAGE plpgsql;

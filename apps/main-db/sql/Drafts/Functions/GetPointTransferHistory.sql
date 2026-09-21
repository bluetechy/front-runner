CREATE OR REPLACE FUNCTION GetPointTransferHistory(UserId INT, Limit INT)
    RETURNS TABLE (
                      TransferId INT,
                      SenderId INT,
                      ReceiverId INT,
                      Points INT,
                      TransferReason TEXT,
                      TransferTimestamp TIMESTAMPTZ
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT TransferId, SenderId, ReceiverId, Points, TransferReason, TransferTimestamp
        FROM PointTransfers
        WHERE SenderId = UserId OR ReceiverId = UserId
        ORDER BY TransferTimestamp DESC
        LIMIT Limit;
END;
$$ LANGUAGE plpgsql;

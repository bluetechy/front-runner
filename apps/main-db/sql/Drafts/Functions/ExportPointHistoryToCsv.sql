CREATE OR REPLACE FUNCTION ExportPointHistoryToCsv(UserId INT)
    RETURNS TEXT AS $$
DECLARE
    CsvContent TEXT;
BEGIN
    -- Generate CSV content with point history data.
    -- Save the content to a file or return it for download.
    CsvContent := 'Transaction ID,Points Change,Reason,Details,Transaction Timestamp\n';

    FOR PointTransaction IN (SELECT LogId, PointsChange, TransactionReason, TransactionDetails, TransactionTimestamp FROM PointUsageLogs WHERE UserId = UserId)
        LOOP
            CsvContent := CsvContent || PointTransaction.LogId || ',' || PointTransaction.PointsChange || ',' || PointTransaction.TransactionReason || ',' || PointTransaction.TransactionDetails || ',' || PointTransaction.TransactionTimestamp || '\n';
        END LOOP;

    RETURN CsvContent;
END;
$$ LANGUAGE plpgsql;

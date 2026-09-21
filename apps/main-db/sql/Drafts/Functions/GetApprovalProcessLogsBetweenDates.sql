CREATE OR REPLACE FUNCTION GetApprovalProcessLogsBetweenDates(StartDate TIMESTAMPTZ, EndDate TIMESTAMPTZ)
    RETURNS TABLE (
                      LogId INT,
                      RequestId INT,
                      FromStageId INT,
                      ToStageId INT,
                      LogText TEXT,
                      LogTimestamp TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT LogId, RequestId, FromStageId, ToStageId, LogText, LogTimestamp
        FROM ApprovalProcessLogs
        WHERE LogTimestamp >= StartDate AND LogTimestamp <= EndDate;
END;
$$ LANGUAGE plpgsql;

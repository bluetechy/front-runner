CREATE OR REPLACE FUNCTION GetApprovalProcessLogsByRequest(RequestId INT)
    RETURNS TABLE (
                      LogId INT,
                      FromStageId INT,
                      ToStageId INT,
                      LogText TEXT,
                      LogTimestamp TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT LogId, FromStageId, ToStageId, LogText, LogTimestamp
        FROM ApprovalProcessLogs
        WHERE RequestId = RequestId;
END;
$$ LANGUAGE plpgsql;

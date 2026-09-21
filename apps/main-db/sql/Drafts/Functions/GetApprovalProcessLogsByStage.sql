CREATE OR REPLACE FUNCTION GetApprovalProcessLogsByStage(StageId INT)
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
        WHERE FromStageId = StageId OR ToStageId = StageId;
END;
$$ LANGUAGE plpgsql;

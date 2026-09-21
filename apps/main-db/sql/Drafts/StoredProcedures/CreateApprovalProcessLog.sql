CREATE OR REPLACE PROCEDURE CreateApprovalProcessLog(
    RequestId INT,
    FromStageId INT,
    ToStageId INT,
    LogText TEXT
)
AS $$
BEGIN
    INSERT INTO ApprovalProcessLogs (RequestId, FromStageId, ToStageId, LogText)
    VALUES (RequestId, FromStageId, ToStageId, LogText);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE CancelApprovalProcess(ProcessId INT, CancellationReason TEXT)
AS $$
BEGIN
    UPDATE ApprovalProcesses
    SET
        Completed = true,
        CancellationReason = CancellationReason,
        CompletionTimestamp = NOW()
    WHERE
            ProcessId = ProcessId;
END;
$$ LANGUAGE plpgsql;

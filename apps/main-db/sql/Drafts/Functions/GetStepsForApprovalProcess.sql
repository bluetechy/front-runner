CREATE OR REPLACE FUNCTION GetStepsForApprovalProcess(ApprovalProcessId INT)
    RETURNS TABLE (
                      StepId INT,
                      Name VARCHAR(100),
                      ApproverId INT,
                      Completed BOOLEAN,
                      CompletionComments TEXT,
                      CompletionTimestamp TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT StepId, Name, ApproverId, Completed, CompletionComments, CompletionTimestamp
        FROM ApprovalProcessSteps
        WHERE ApprovalProcessId = ApprovalProcessId;
END;
$$ LANGUAGE plpgsql;

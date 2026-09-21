CREATE OR REPLACE FUNCTION GetApprovalStepsForUser(ApproverId INT)
    RETURNS TABLE (
                      StepId INT,
                      ProcessName VARCHAR(100),
                      StepName VARCHAR(100),
                      ApprovalComments TEXT
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT aps.StepId, ap.Name AS ProcessName, aps.Name AS StepName, aps.ApprovalComments
        FROM ApprovalProcessSteps aps
                 JOIN ApprovalProcesses ap ON aps.ApprovalProcessId = ap.ProcessId
        WHERE aps.ApproverId = ApproverId AND aps.Completed = false;
END;
$$ LANGUAGE plpgsql;

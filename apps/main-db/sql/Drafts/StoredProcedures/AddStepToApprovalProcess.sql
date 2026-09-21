CREATE OR REPLACE PROCEDURE AddStepToApprovalProcess(
    ApprovalProcessId INT,
    StepName VARCHAR(100),
    ApproverId INT
)
AS $$
BEGIN
    INSERT INTO ApprovalProcessSteps (ApprovalProcessId, Name, ApproverId)
    VALUES (ApprovalProcessId, StepName, ApproverId);
END;
$$ LANGUAGE plpgsql;

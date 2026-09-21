CREATE OR REPLACE PROCEDURE ApproveOrRejectStep(StepId INT, ApprovalStatus BOOLEAN, Comments TEXT)
AS $$
BEGIN
    UPDATE ApprovalProcessSteps
    SET
        Completed = true,
        ApprovalStatus = ApprovalStatus,
        ApprovalComments = Comments,
        CompletionTimestamp = NOW()
    WHERE
            StepId = StepId;
END;
$$ LANGUAGE plpgsql;

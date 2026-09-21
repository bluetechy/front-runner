CREATE OR REPLACE PROCEDURE CompleteApprovalStep(StepId INT, Comments TEXT)
AS $$
BEGIN
    UPDATE ApprovalProcessSteps
    SET
        Completed = true,
        CompletionComments = Comments,
        CompletionTimestamp = NOW()
    WHERE
            StepId = StepId;
END;
$$ LANGUAGE plpgsql;

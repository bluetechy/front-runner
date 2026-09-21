CREATE OR REPLACE PROCEDURE UpdateApprovalWorkflowStage(
    StageId INT,
    StageName VARCHAR(50) NOT NULL,
    Description TEXT
)
AS $$
BEGIN
    UPDATE ApprovalWorkflowStages
    SET
        StageName = StageName,
        Description = Description
    WHERE
            StageId = StageId;
END;
$$ LANGUAGE plpgsql;

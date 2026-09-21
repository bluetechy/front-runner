CREATE OR REPLACE PROCEDURE CreateApprovalWorkflowStage(
    StageName VARCHAR(50) NOT NULL,
    Description TEXT
)
AS $$
BEGIN
    INSERT INTO ApprovalWorkflowStages (StageName, Description)
    VALUES (StageName, Description);
END;
$$ LANGUAGE plpgsql;

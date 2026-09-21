CREATE TABLE ApprovalWorkflowStages (
    StageId serial PRIMARY KEY,
    StageName VARCHAR(50) NOT NULL,
    Description TEXT,
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

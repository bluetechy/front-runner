-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE ApprovalWorkflowPermissions (
    PermissionId serial PRIMARY KEY,
    StageId INT REFERENCES ApprovalWorkflowStages(StageId),
    UserId INT REFERENCES Users(UserId),
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE ApprovalRequests (
    RequestId serial PRIMARY KEY,
    UserId INT REFERENCES Users(UserId),
    TaskId INT REFERENCES Tasks(TaskId),
    ItemId INT, -- Reference to the item being requested (if applicable)
    StageId INT REFERENCES ApprovalWorkflowStages(StageId),
    RequestText TEXT NOT NULL,
    Status VARCHAR(20) DEFAULT 'Pending', -- Status of the request (e.g., 'Pending', 'Approved', 'Rejected')
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

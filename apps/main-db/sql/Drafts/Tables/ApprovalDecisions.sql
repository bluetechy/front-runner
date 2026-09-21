-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE ApprovalDecisions (
    DecisionId serial PRIMARY KEY,
    RequestId INT REFERENCES ApprovalRequests(RequestId),
    ApproverId INT REFERENCES Users(UserId),
    DecisionText TEXT,
    DecisionStatus VARCHAR(20) NOT NULL, -- 'Approve' or 'Reject'
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

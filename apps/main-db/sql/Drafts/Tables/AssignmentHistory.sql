CREATE TABLE AssignmentHistory (
    AssignmentId serial PRIMARY KEY,
    TaskId INT REFERENCES Tasks(TaskId),
    PreviousUserId INT,
    NewUserId INT,
    AssignedAt TIMESTAMPTZ DEFAULT NOW()
);

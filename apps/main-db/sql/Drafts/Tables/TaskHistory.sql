CREATE TABLE TaskHistory (
    HistoryId serial PRIMARY KEY,
    TaskId INT REFERENCES Tasks(TaskId),
    UserId INT,
    ChangeType VARCHAR(50) NOT NULL,
    OldValue TEXT,
    NewValue TEXT,
    ChangedAt TIMESTAMPTZ DEFAULT NOW()
);

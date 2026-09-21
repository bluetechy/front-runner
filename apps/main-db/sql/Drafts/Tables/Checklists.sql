CREATE TABLE Checklists (
    ChecklistId serial PRIMARY KEY,
    TaskId INT REFERENCES Tasks(TaskId),
    ItemText TEXT NOT NULL,
    Completed BOOLEAN DEFAULT FALSE,
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

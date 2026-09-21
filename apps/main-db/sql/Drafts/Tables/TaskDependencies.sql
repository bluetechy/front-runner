CREATE TABLE TaskDependencies (
    DependencyId serial PRIMARY KEY,
    DependentTaskId INT REFERENCES Tasks(TaskId),
    PrerequisiteTaskId INT REFERENCES Tasks(TaskId),
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE Tasks (
    TaskId serial PRIMARY KEY,
    RoadmapId INT REFERENCES Roadmaps(RoadmapId) ON DELETE CASCADE,
    Title VARCHAR(255) NOT NULL,
    Description TEXT,
    DueDate DATE,
    Status VARCHAR(20) DEFAULT 'Pending', -- You can use different status values (e.g., 'Completed', 'In Progress', etc.)
    CreatedAt TIMESTAMPTZ DEFAULT NOW(),
    AssignedUserId INT REFERENCES Users(UserId), -- Reference to the user assigned to the task
    DependencyId INT REFERENCES TaskDependencies(DependencyId) -- Reference to task dependencies
);

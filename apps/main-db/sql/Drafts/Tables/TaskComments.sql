-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE TaskComments (
    CommentId serial PRIMARY KEY,
    TaskId INT REFERENCES Tasks(TaskId),
    UserId INT REFERENCES Users(UserId),
    CommentText TEXT NOT NULL,
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

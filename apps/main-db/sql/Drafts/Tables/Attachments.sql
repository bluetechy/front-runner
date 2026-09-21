CREATE TABLE Attachments (
    AttachmentId serial PRIMARY KEY,
    TaskId INT REFERENCES Tasks(TaskId),
    CommentId INT REFERENCES TaskComments(CommentId),
    FilePath VARCHAR(255) NOT NULL,
    FileName VARCHAR(100) NOT NULL,
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

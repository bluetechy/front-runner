-- Both tables it references are live now: Users and Tasks are "dbo"."Users"
-- and "dbo"."Tasks". Migrating this means uuid keys, audit columns and
-- organization scoping -- see SCHEMA-NOTES.md.

CREATE TABLE Notifications (
    NotificationId serial PRIMARY KEY,
    UserId INT REFERENCES Users(UserId),
    TaskId INT REFERENCES Tasks(TaskId),
    Message TEXT NOT NULL,
    NotificationType VARCHAR(50) NOT NULL,
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

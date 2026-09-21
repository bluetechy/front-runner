-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE Notifications (
    NotificationId serial PRIMARY KEY,
    UserId INT REFERENCES Users(UserId),
    TaskId INT REFERENCES Tasks(TaskId),
    Message TEXT NOT NULL,
    NotificationType VARCHAR(50) NOT NULL,
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

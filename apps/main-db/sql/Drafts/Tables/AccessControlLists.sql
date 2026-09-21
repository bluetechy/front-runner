-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE AccessControlLists (
    AclId serial PRIMARY KEY,
    UserId INT REFERENCES Users(UserId),
    TaskId INT REFERENCES Tasks(TaskId),
    PermissionType VARCHAR(50) NOT NULL
);

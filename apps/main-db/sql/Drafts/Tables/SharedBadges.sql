-- STATUS: was commented out in the original Tables-ChatGPT.sql.
-- OVERLAP: covered by dbo.SharedBadges in the live schema. See SCHEMA-NOTES.md.
-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE SharedBadges (
    SharedId serial PRIMARY KEY,
    UserId INT REFERENCES Users(UserId),
    BadgeId INT REFERENCES Badges(BadgeId),
    SharedWithUserId INT REFERENCES Users(UserId),
    SharedAt TIMESTAMPTZ DEFAULT NOW()
);

-- OVERLAP: covered by dbo.UserTallies in the live schema. See SCHEMA-NOTES.md.
-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE UserPointTotals (
    UserId INT PRIMARY KEY REFERENCES Users(UserId),
    PointTypeId INT REFERENCES PointTypes(PointTypeId),
    Points INT DEFAULT 0,
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE UserPointTotals
    ADD COLUMN DailyLimit INT, -- Daily point accumulation limit
    ADD COLUMN SpendLimit INT; -- Point spending limit

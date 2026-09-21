-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE UserPointLevels (
    UserId INT REFERENCES Users(UserId),
    PointTypeId INT REFERENCES PointTypes(PointTypeId), -- Reference to the point type
    LevelId INT REFERENCES PointLevels(LevelId), -- Reference to the level
    ReachedAt TIMESTAMPTZ DEFAULT NOW()
);

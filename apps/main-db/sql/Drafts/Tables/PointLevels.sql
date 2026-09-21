CREATE TABLE PointLevels (
    LevelId serial PRIMARY KEY,
    LevelName VARCHAR(50) NOT NULL,
    PointTypeId INT REFERENCES PointTypes(PointTypeId), -- Reference to the point type
    MinPoints INT NOT NULL, -- Minimum points required to reach this level
    RewardDescription TEXT, -- Description of rewards or benefits for reaching this level
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

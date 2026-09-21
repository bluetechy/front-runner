-- OVERLAP: covered by dbo.Points in the live schema. See SCHEMA-NOTES.md.

CREATE TABLE PointTypes (
    PointTypeId serial PRIMARY KEY,
    TypeName VARCHAR(50) NOT NULL,
    Description TEXT,
    ExpirationDuration INTERVAL, -- Point type-specific expiration duration
    ResetCondition TEXT, -- Condition for resetting points
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

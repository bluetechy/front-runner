-- OVERLAP: covered by dbo.UserPoints in the live schema. See SCHEMA-NOTES.md.
-- MISSING REFS: UserPoints (no such table in this folder).

CREATE TABLE PointTransactions (
    TransactionId serial PRIMARY KEY,
    UserId INT REFERENCES UserPoints(UserId),
    PointTypeId INT REFERENCES PointTypes(PointTypeId),
    PointsChange INT NOT NULL, -- Positive for adding points, negative for deductions
    TransactionReason TEXT NOT NULL,
    TransactionDetails JSONB, -- Store additional details as JSON
    TransactionTimestamp TIMESTAMPTZ DEFAULT NOW()
);

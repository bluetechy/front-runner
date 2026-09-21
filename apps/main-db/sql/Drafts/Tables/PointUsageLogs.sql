-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE PointUsageLogs (
    LogId serial PRIMARY KEY,
    UserId INT REFERENCES Users(UserId),
    PointsChange INT NOT NULL, -- Positive for earning, negative for spending
    TransactionReason TEXT NOT NULL,
    TransactionDetails JSONB, -- Store additional details as JSON
    TransactionTimestamp TIMESTAMPTZ DEFAULT NOW()
);

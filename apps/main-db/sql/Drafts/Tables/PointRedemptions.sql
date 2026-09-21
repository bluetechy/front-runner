-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE PointRedemptions (
    RedemptionId serial PRIMARY KEY,
    UserId INT REFERENCES Users(UserId),
    RedeemedPoints INT NOT NULL,
    RedemptionDescription TEXT,
    RedemptionStatus VARCHAR(20) NOT NULL, -- 'Pending', 'Approved', 'Rejected', etc.
    RedeemedAt TIMESTAMPTZ DEFAULT NOW()
);

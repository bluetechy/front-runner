-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE PointTransfers (
    TransferId serial PRIMARY KEY,
    SenderUserId INT REFERENCES Users(UserId),
    ReceiverUserId INT REFERENCES Users(UserId),
    TransferredPoints INT NOT NULL,
    TransferDescription TEXT,
    TransferTimestamp TIMESTAMPTZ DEFAULT NOW()
);

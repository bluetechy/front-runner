CREATE TABLE EventLog (
    EventId serial PRIMARY KEY,
    UserId INT,
    EventType VARCHAR(100) NOT NULL,
    EventDescription TEXT,
    EventTimestamp TIMESTAMPTZ DEFAULT NOW()
);

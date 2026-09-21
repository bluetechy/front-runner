CREATE TABLE ActivityFeed (
    ActivityId serial PRIMARY KEY,
    UserId INT,
    ActivityText TEXT NOT NULL,
    ActivityTimestamp TIMESTAMPTZ DEFAULT NOW()
);

-- STATUS: was commented out in the original Tables-ChatGPT.sql.
-- OVERLAP: covered by dbo.BadgeStatistics in the live schema. See SCHEMA-NOTES.md.

CREATE TABLE BadgeStatistics (
    StatisticId serial PRIMARY KEY,
    BadgeId INT REFERENCES Badges(BadgeId),
    UsersEarned INT, -- Number of users who have earned this badge
    LatestEarnings INT, -- Number of recent badge earnings
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

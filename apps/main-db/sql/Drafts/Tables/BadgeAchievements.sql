-- STATUS: was commented out in the original Tables-ChatGPT.sql.
-- OVERLAP: covered by dbo.BadgeAchievements in the live schema. See SCHEMA-NOTES.md.
-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE BadgeAchievements (
    AchievementId serial PRIMARY KEY,
    UserId INT REFERENCES Users(UserId),
    BadgeId INT REFERENCES Badges(BadgeId),
    MilestoneDescription TEXT NOT NULL,
    MilestoneDate TIMESTAMPTZ DEFAULT NOW(),
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

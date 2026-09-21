-- OVERLAP: covered by dbo.UserBadges in the live schema. See SCHEMA-NOTES.md.
-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE UserBadges (
    UserBadgeId serial PRIMARY KEY,
    UserId INT REFERENCES Users(UserId),
    BadgeId INT REFERENCES Badges(BadgeId),
    EarnedAt TIMESTAMPTZ DEFAULT NOW(),
    EarnedDescription TEXT, -- Description of how the badge was earned
    ProgressGoal INT, -- Badge progress goal (if applicable)
    ProgressCurrent INT, -- Current progress toward earning the badge
    RevokedAt TIMESTAMPTZ, -- Badge revocation date (if applicable)
    UNIQUE (UserId, BadgeId) -- Ensure a user can only earn a badge once
);

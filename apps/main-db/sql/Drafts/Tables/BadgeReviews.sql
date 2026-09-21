-- STATUS: was commented out in the original Tables-ChatGPT.sql.
-- OVERLAP: covered by dbo.BadgeReviews in the live schema. See SCHEMA-NOTES.md.
-- MISSING REFS: Users (no such table in this folder).

CREATE TABLE BadgeReviews (
    ReviewId serial PRIMARY KEY,
    BadgeId INT REFERENCES Badges(BadgeId),
    UserId INT REFERENCES Users(UserId),
    ReviewStatus VARCHAR(20) NOT NULL, -- 'Pending', 'Approved', 'Rejected', etc.
    ReviewComment TEXT, -- Comments or feedback from the reviewer
    ReviewedAt TIMESTAMPTZ DEFAULT NOW()
);

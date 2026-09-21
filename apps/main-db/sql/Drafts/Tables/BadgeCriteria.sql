-- STATUS: was commented out in the original Tables-ChatGPT.sql.
-- OVERLAP: covered by dbo.BadgeCriteria in the live schema. See SCHEMA-NOTES.md.

CREATE TABLE BadgeCriteria (
    CriteriaId serial PRIMARY KEY,
    BadgeId INT REFERENCES Badges(BadgeId),
    CriteriaDescription TEXT NOT NULL,
    CriteriaType VARCHAR(50) NOT NULL, -- Type of criteria (e.g., 'Activity', 'Achievement')
    CriteriaValue INT NOT NULL, -- Value required for criteria completion
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

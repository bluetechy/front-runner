-- STATUS: was commented out in the original Tables-ChatGPT.sql.
-- OVERLAP: covered by dbo.BadgeEventCriteria in the live schema. See SCHEMA-NOTES.md.

CREATE TABLE BadgeEventCriteria (
    EventCriteriaId serial PRIMARY KEY,
    EventId INT REFERENCES BadgeEvents(EventId),
    BadgeId INT REFERENCES Badges(BadgeId),
    CriteriaDescription TEXT NOT NULL,
    -- Define specific criteria fields as needed
    -- Example: criteria_type VARCHAR(50), criteria_value INT, etc.
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

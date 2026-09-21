-- STATUS: was commented out in the original Tables-ChatGPT.sql.
-- OVERLAP: covered by dbo.BadgeEvents in the live schema. See SCHEMA-NOTES.md.

CREATE TABLE BadgeEvents (
    EventId serial PRIMARY KEY,
    EventName VARCHAR(100) NOT NULL,
    EventDescription TEXT,
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

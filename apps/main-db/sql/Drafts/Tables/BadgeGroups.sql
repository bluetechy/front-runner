-- STATUS: was commented out in the original Tables-ChatGPT.sql.
-- OVERLAP: covered by dbo.BadgeGroups in the live schema. See SCHEMA-NOTES.md.

CREATE TABLE BadgeGroups (
    GroupId serial PRIMARY KEY,
    GroupName VARCHAR(100) NOT NULL,
    Description TEXT,
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

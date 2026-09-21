-- STATUS: was commented out in the original Tables-ChatGPT.sql.
-- OVERLAP: covered by dbo.BadgeGroupRelationships in the live schema. See SCHEMA-NOTES.md.

CREATE TABLE BadgeGroupRelationships (
    RelationshipId serial PRIMARY KEY,
    BadgeId INT REFERENCES Badges(BadgeId),
    GroupId INT REFERENCES BadgeGroups(GroupId),
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

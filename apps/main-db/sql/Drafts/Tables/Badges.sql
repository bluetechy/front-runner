-- STATUS: was commented out in the original Tables-ChatGPT.sql.
-- OVERLAP: covered by dbo.Badges in the live schema. See SCHEMA-NOTES.md.

CREATE TABLE Badges (
    BadgeId serial PRIMARY KEY,
    BadgeName VARCHAR(100) NOT NULL,
    Description TEXT,
    BadgeIconUrl VARCHAR(255), -- URL to badge icon or image
    BadgeCategory VARCHAR(50), -- Badge category
    BadgeLevel INT, -- Badge level (if applicable)
    ExpirationDate TIMESTAMPTZ, -- Badge expiration date
    OwnerUserId INT, -- Badge owner (if applicable)
    IsPublic BOOLEAN, -- Badge visibility
    BadgeRarity VARCHAR(20), -- Badge rarity
    BadgeValue INT, -- Badge point value or worth
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

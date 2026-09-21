-- STATUS: was commented out in the original Tables-ChatGPT.sql.
-- OVERLAP: covered by dbo.BadgeCategories in the live schema. See SCHEMA-NOTES.md.

CREATE TABLE BadgeCategories (
    CategoryId serial PRIMARY KEY,
    CategoryName VARCHAR(100) NOT NULL,
    ParentCategoryId INT REFERENCES BadgeCategories(CategoryId),
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION SearchBadgesByKeyword(Keyword VARCHAR(100))
    RETURNS TABLE (
                      BadgeId INT,
                      BadgeName VARCHAR(100),
                      BadgeDescription TEXT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT BadgeId, BadgeName, BadgeDescription
        FROM Badges
        WHERE BadgeName ILIKE '%' || Keyword || '%' OR BadgeDescription ILIKE '%' || Keyword || '%';
END;
$$ LANGUAGE plpgsql;

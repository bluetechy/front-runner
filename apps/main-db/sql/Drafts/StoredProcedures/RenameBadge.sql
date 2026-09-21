CREATE OR REPLACE PROCEDURE RenameBadge(BadgeId INT, NewName VARCHAR(100))
AS $$
BEGIN
    UPDATE Badges
    SET BadgeName = NewName
    WHERE BadgeId = BadgeId;
END;
$$ LANGUAGE plpgsql;

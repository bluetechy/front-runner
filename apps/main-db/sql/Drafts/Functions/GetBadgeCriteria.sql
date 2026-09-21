CREATE OR REPLACE FUNCTION GetBadgeCriteria(BadgeId INT)
    RETURNS TABLE (
                      CriteriaId INT,
                      CriteriaDescription TEXT,
                      CriteriaType VARCHAR(50),
                      CriteriaValue INT
                  ) AS $$
BEGIN
    RETURN QUERY
        SELECT CriteriaId, CriteriaDescription, CriteriaType, CriteriaValue
        FROM BadgeCriteria
        WHERE BadgeId = BadgeId;
END;
$$ LANGUAGE plpgsql;

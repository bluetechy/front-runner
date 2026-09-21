CREATE OR REPLACE PROCEDURE UpdateBadgeCriteria(CriteriaId INT, CriteriaDescription TEXT, CriteriaType VARCHAR(50), CriteriaValue INT)
AS $$
BEGIN
    UPDATE BadgeCriteria
    SET
        CriteriaDescription = CriteriaDescription,
        CriteriaType = CriteriaType,
        CriteriaValue = CriteriaValue
    WHERE CriteriaId = CriteriaId;
END;
$$ LANGUAGE plpgsql;

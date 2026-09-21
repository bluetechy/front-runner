CREATE OR REPLACE PROCEDURE ApplyPointMultiplier(UserId INT, MultiplierId INT)
AS $$
BEGIN
    DECLARE MultiplierFactor DECIMAL(5,2);

    SELECT MultiplierFactor INTO MultiplierFactor
    FROM PointMultipliers
    WHERE MultiplierId = MultiplierId;

    IF MultiplierFactor IS NOT NULL THEN
    UPDATE UserPointTotals
    SET Points = Points * MultiplierFactor
        WHERE UserId = UserId;
    END IF;
    END;
$$ LANGUAGE plpgsql;

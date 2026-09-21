--
-- Counts the rows a query returns. Pass the query as text, without a trailing
-- semicolon: PERFORM "test"."AssertRowCount"('SELECT * FROM "dbo"."Users"', 5, '...')
--

CREATE FUNCTION "test"."AssertRowCount" (_Query text, _Expected bigint, _Message text) RETURNS void AS $$
DECLARE
    _Actual bigint;
BEGIN
    EXECUTE format('SELECT count(*) FROM (%s) AS "Rows"', _Query) INTO _Actual;
    IF _Actual IS DISTINCT FROM _Expected THEN
        PERFORM "test"."Fail"(format('%s (expected %s rows, got %s)', _Message, _Expected, _Actual));
    END IF;
END;
$$ LANGUAGE plpgsql;

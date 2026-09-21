--
-- anycompatible rather than anyelement so the common integer/bigint mismatch
-- (count(*) is bigint) resolves instead of erroring. NULL equals NULL here.
--

CREATE FUNCTION "test"."AssertEquals" (_Actual anycompatible, _Expected anycompatible, _Message text) RETURNS void AS $$
BEGIN
    IF _Actual IS DISTINCT FROM _Expected THEN
        PERFORM "test"."Fail"(format('%s (expected %L, got %L)', _Message, _Expected, _Actual));
    END IF;
END;
$$ LANGUAGE plpgsql;

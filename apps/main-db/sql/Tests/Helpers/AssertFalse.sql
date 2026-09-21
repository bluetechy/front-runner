CREATE FUNCTION "test"."AssertFalse" (_Actual boolean, _Message text) RETURNS void AS $$
BEGIN
    IF _Actual IS NOT FALSE THEN
        PERFORM "test"."Fail"(format('%s (expected false, got %L)', _Message, _Actual));
    END IF;
END;
$$ LANGUAGE plpgsql;

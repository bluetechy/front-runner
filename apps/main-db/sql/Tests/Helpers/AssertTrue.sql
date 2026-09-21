CREATE FUNCTION "test"."AssertTrue" (_Actual boolean, _Message text) RETURNS void AS $$
BEGIN
    IF _Actual IS NOT TRUE THEN
        PERFORM "test"."Fail"(format('%s (expected true, got %L)', _Message, _Actual));
    END IF;
END;
$$ LANGUAGE plpgsql;

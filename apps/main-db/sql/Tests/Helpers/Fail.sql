--
-- Every assertion funnels through here. A test fails by raising, which the
-- runner catches and reports; a test that returns is a test that passed.
--

CREATE FUNCTION "test"."Fail" (_Message text) RETURNS void AS $$
BEGIN
    RAISE EXCEPTION 'assertion failed: %', _Message;
END;
$$ LANGUAGE plpgsql;

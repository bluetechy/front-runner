--
-- Looks up a fixture row's UUID by name, so tests read
-- "test"."Fixture"('User.Member') rather than a literal UUID. Raises on an
-- unknown key, which turns a typo into a failing test rather than a silent
-- NULL that quietly matches nothing.
--

CREATE FUNCTION "test"."Fixture" (_Key varchar(64)) RETURNS uuid AS $$
DECLARE
    _UUID uuid;
BEGIN
    SELECT "Fixtures"."UUID" INTO _UUID FROM "test"."Fixtures" WHERE "Fixtures"."Key" = _Key;
    IF _UUID IS NULL THEN
        RAISE EXCEPTION 'unknown fixture key: %', _Key;
    END IF;
    RETURN _UUID;
END;
$$ LANGUAGE plpgsql STABLE;

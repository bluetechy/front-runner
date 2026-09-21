--
-- Asserts that a statement fails. The nested block is an implicit savepoint,
-- so whatever the statement managed to write before failing is rolled back.
-- Pass _ExpectedMessage to also require the error text to contain a substring.
--

CREATE FUNCTION "test"."AssertRaises" (_Statement text, _Message text, _ExpectedMessage text DEFAULT NULL) RETURNS void AS $$
BEGIN
    BEGIN
        EXECUTE _Statement;
    EXCEPTION WHEN OTHERS THEN
        IF _ExpectedMessage IS NOT NULL AND strpos(SQLERRM, _ExpectedMessage) = 0 THEN
            PERFORM "test"."Fail"(format('%s (expected an error containing %L, got %L)', _Message, _ExpectedMessage, SQLERRM));
        END IF;
        RETURN;
    END;
    PERFORM "test"."Fail"(format('%s (expected an error, the statement succeeded)', _Message));
END;
$$ LANGUAGE plpgsql;

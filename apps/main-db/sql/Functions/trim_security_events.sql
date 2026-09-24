-- snake_case on purpose: trigger plumbing, not app-facing API. See SCHEMA-NOTES.md.
--
-- The retention rule for the security log, enforced by the table rather than by
-- whatever happens to be writing to it.
--
-- **Twelve months.** It is written here and nowhere else, and it is what the
-- privacy policy says under "How long we keep it", so the two have to agree:
-- if this number changes, that sentence changes with it. See
-- src/privacy/sections.ts in main-gui.
--
-- A trigger rather than a call inside "dbo"."LogSecurityEvent", because that is
-- not the only writer: "dbo"."ReviewSecurityEvent" logs a row of its own when
-- somebody reports activity they did not recognize, and a retention rule that
-- three writers have to remember to apply is a retention rule that one of them
-- will not. There is no scheduler in this product to sweep the table from
-- outside, so the writes do it: every event an account records takes its own
-- old ones with it.
--
-- The consequence worth knowing, and worth wording the policy around: an
-- account nobody touches is not swept, because nothing arrives to sweep it. It
-- keeps its last twelve months rather than emptying on the anniversary.
--
-- Only this account's rows. A trigger that deleted across the table would make
-- one person's login the thing that erased another's, and would scan the whole
-- table on every insert.
--
-- No recursion to worry about: a DELETE does not fire an INSERT trigger.
--
CREATE FUNCTION "dbo"."trim_security_events" () RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM "dbo"."SecurityEvents"
    WHERE "SecurityEvents"."UserUUID" = NEW."UserUUID"
        AND "SecurityEvents"."OccurredAt" < CURRENT_TIMESTAMP - interval '12 months';

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

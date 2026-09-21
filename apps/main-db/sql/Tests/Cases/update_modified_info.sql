--
-- update_modified_info runs BEFORE UPDATE on every table with audit columns.
-- These tests update fixture rows rather than rows created in the same
-- transaction: CURRENT_TIMESTAMP and now() are both fixed at the start of the
-- transaction, so a row inserted and updated in one transaction has an
-- UpdatedAt identical to its CreatedAt and proves nothing.
--

CREATE FUNCTION "test"."TestUpdateModifiedInfo_BumpsUpdatedAt" () RETURNS void AS $$
DECLARE
    _User record;
BEGIN
    UPDATE "dbo"."Users" SET "Name" = 'Renamed' WHERE "UserUUID" = "test"."Fixture"('User.Member')
    RETURNING * INTO _User;

    PERFORM "test"."AssertTrue"(_User."UpdatedAt" > _User."CreatedAt", 'UpdatedAt was not moved forward by the update');
END;
$$ LANGUAGE plpgsql;

-- KNOWN GAP: the trigger sets UpdatedAt but not UpdatedBy, so callers that
-- forget to set it leave the original author's name on a row somebody else
-- changed. Documented rather than fixed -- the trigger has no way to know who
-- the caller is.
CREATE FUNCTION "test"."TestUpdateModifiedInfo_LeavesUpdatedByToTheCaller" () RETURNS void AS $$
DECLARE
    _User record;
BEGIN
    UPDATE "dbo"."Users" SET "Name" = 'Renamed' WHERE "UserUUID" = "test"."Fixture"('User.Member')
    RETURNING * INTO _User;
    PERFORM "test"."AssertEquals"(_User."UpdatedBy"::text, 'fixtures', 'the update trigger now maintains UpdatedBy -- update this test');

    UPDATE "dbo"."Users" SET "Name" = 'Renamed Again', "UpdatedBy" = 'editor' WHERE "UserUUID" = "test"."Fixture"('User.Member')
    RETURNING * INTO _User;
    PERFORM "test"."AssertEquals"(_User."UpdatedBy"::text, 'editor', 'an explicitly supplied UpdatedBy was not kept');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestUpdateModifiedInfo_LeavesCreatedColumnsAlone" () RETURNS void AS $$
DECLARE
    _User record;
BEGIN
    UPDATE "dbo"."Users" SET "Name" = 'Renamed' WHERE "UserUUID" = "test"."Fixture"('User.Member')
    RETURNING * INTO _User;

    PERFORM "test"."AssertEquals"(_User."CreatedBy"::text, 'fixtures', 'the update trigger rewrote CreatedBy');
END;
$$ LANGUAGE plpgsql;

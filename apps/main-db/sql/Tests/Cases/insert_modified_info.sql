--
-- insert_modified_info runs BEFORE INSERT on every table that has the four
-- audit columns, copying the created values onto the updated ones so a row
-- that has never been touched reads as created-and-updated by the same hand.
--

CREATE FUNCTION "test"."TestInsertModifiedInfo_MirrorsCreatedOntoUpdated" () RETURNS void AS $$
DECLARE
    _User record;
BEGIN
    INSERT INTO "dbo"."Users" ("Name", "LoginName", "CreatedBy") VALUES ('Fresh User', 'fresh', 'someone')
    RETURNING * INTO _User;

    PERFORM "test"."AssertEquals"(_User."UpdatedAt", _User."CreatedAt", 'UpdatedAt was not seeded from CreatedAt on insert');
    PERFORM "test"."AssertEquals"(_User."UpdatedBy"::text, 'someone', 'UpdatedBy was not seeded from CreatedBy on insert');
END;
$$ LANGUAGE plpgsql;

-- An explicit UpdatedBy on the insert is overwritten: the trigger always wins.
CREATE FUNCTION "test"."TestInsertModifiedInfo_OverridesAnExplicitUpdatedBy" () RETURNS void AS $$
DECLARE
    _User record;
BEGIN
    INSERT INTO "dbo"."Users" ("Name", "LoginName", "CreatedBy", "UpdatedBy") VALUES ('Fresh User', 'fresh', 'creator', 'someone else')
    RETURNING * INTO _User;

    PERFORM "test"."AssertEquals"(_User."UpdatedBy"::text, 'creator', 'the insert trigger did not override the supplied UpdatedBy');
END;
$$ LANGUAGE plpgsql;

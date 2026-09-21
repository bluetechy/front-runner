--
-- One log serving two readers. The drafts had ActivityFeed and EventLog as
-- separate tables with the same shape; IsUserVisible is what lets a single
-- table answer both "what should this person see" and "what happened".
--

CREATE FUNCTION "test"."TestEventLog_FeedsTheActivityListFromVisibleRows" () RETURNS void AS $$
DECLARE
    _Types text;
BEGIN
    SELECT string_agg("EventType", ', ' ORDER BY "OccurredAt") INTO _Types FROM "dbo"."EventLog"
    WHERE "OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "UserUUID" = "test"."Fixture"('User.Member')
        AND "IsUserVisible" = true;

    PERFORM "test"."AssertEquals"(_Types, 'BadgeEarned, TaskAssigned', 'the feed should be the visible rows in time order');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestEventLog_KeepsAuditRowsOutOfTheFeed" () RETURNS void AS $$
DECLARE
    _Total bigint;
    _Visible bigint;
BEGIN
    SELECT count(*), count(*) FILTER (WHERE "IsUserVisible") INTO _Total, _Visible FROM "dbo"."EventLog";
    PERFORM "test"."AssertEquals"(_Total, 3::bigint, 'three events in total');
    PERFORM "test"."AssertEquals"(_Visible, 2::bigint, 'the system event should not reach a feed');
END;
$$ LANGUAGE plpgsql;

-- A system event belongs to nobody and to no organization, which is why both
-- columns are nullable. A NOT NULL on either would force a fake user.
CREATE FUNCTION "test"."TestEventLog_AcceptsAnEventWithNoUserOrOrganization" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."EventLog" WHERE "EventType" = 'SchemaApplied';
    PERFORM "test"."AssertEquals"(_Row."UserUUID", NULL::uuid, 'a system event has no user');
    PERFORM "test"."AssertEquals"(_Row."OrganizationUUID", NULL::uuid, 'a system event has no organization');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestEventLog_DefaultsToInvisible" () RETURNS void AS $$
DECLARE
    _IsUserVisible boolean;
BEGIN
    INSERT INTO "dbo"."EventLog" ("EventType", "Description", "CreatedBy")
    VALUES ('Quiet', 'Nothing to show anyone.', 'test')
    RETURNING "IsUserVisible" INTO _IsUserVisible;
    PERFORM "test"."AssertFalse"(_IsUserVisible, 'an event should stay out of the feed unless it says otherwise');
END;
$$ LANGUAGE plpgsql;

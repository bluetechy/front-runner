--
-- One log, not two. The drafts had ActivityFeed (UserId, ActivityText,
-- ActivityTimestamp) and EventLog (UserId, EventType, EventDescription,
-- EventTimestamp) -- the same append-only table written twice, differing only
-- in whether the row carried a type. Two of them means no rule for which one
-- anything writes to, which is what happened to the two point ledgers.
--
-- "IsUserVisible" is what makes the merge work: the rows a person should see
-- in a feed are the ones flagged here, and everything else is the audit trail.
-- That column is the one thing neither draft had.
--
-- "UserUUID" and "OrganizationUUID" are both nullable -- a system event may
-- belong to nobody and to no organization.
--
CREATE TABLE "dbo"."EventLog" (
    "EventLogUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "OrganizationUUID" uuid, -- NULL for an event that is not org-specific
    "UserUUID" uuid, -- NULL when nobody was behind it
    "EventType" varchar(100) NOT NULL,
    "Description" text,
    "IsUserVisible" boolean NOT NULL DEFAULT false, -- true means it belongs in the activity feed
    "OccurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

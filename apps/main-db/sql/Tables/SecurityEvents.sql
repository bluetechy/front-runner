--
-- The security log: what has happened to one account, as against what has
-- happened in an organization.
--
-- A table of its own rather than more rows in "dbo"."EventLog". That log is
-- the organization's activity feed and the audit trail behind it, and its rows
-- are "TaskCompleted", "PointsEarned", "TalliesRebuilt" -- things that happen
-- inside a company. A login, an email address added, a password changed are
-- things that happen to a person, they are read on a page of their own, and
-- three of the columns here mean nothing to any row up there. Keeping them
-- apart is what "one log, not two" was actually about: two tables with the
-- same shape and no rule for which one anything writes to. These two have
-- different shapes and an obvious rule.
--
-- "OrganizationUUID" is deliberately absent. An account is one account however
-- many organizations it belongs to, and a login is not any of their business.
--
-- "Device" and "Location" are what a login knows and an email change does not,
-- so both are nullable and the page leaves out whichever is missing. They are
-- as coarse as the screen shows them -- "Mac OS", "Utah, USA" -- because a
-- person reading this needs to recognize themselves in it, not be tracked by
-- it, and because a precise location stored against a login is a fact worth
-- more to whoever steals this table than to its owner.
--
-- "ReviewedAt" and "Recognized" are the answer to "do you recognize this
-- activity?", and they are NULL together until it is answered: unanswered is
-- what puts the New mark on a row. The CHECK is what stops them disagreeing,
-- which is the only reason two columns are allowed to carry one fact here --
-- see "dbo"."Notifications"."ReadAt", which needs no companion because "when"
-- is the whole of what it says.
--
CREATE TABLE "dbo"."SecurityEvents" (
    "SecurityEventUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "UserUUID" uuid NOT NULL, -- whose account this happened to
    "EventType" varchar(100) NOT NULL, -- 'LoginSucceeded', 'EmailAdded', and whatever follows
    "Description" text NOT NULL, -- the sentence the page shows
    "Device" varchar(255), -- NULL where nothing was known about it
    "Location" varchar(255), -- NULL likewise, and coarse where it is not
    -- The identity provider's session, on a login row and nothing else.
    --
    -- It is here to answer one question: has this login already been recorded?
    -- main-api meets a token on every request for as long as a session lasts,
    -- so without a durable key for "this login", a restart or a second instance
    -- would write a second "New login" onto somebody's page for a session that
    -- is already on it. The unique constraint below is what actually prevents
    -- that, race and all; the writer's ON CONFLICT is how it stays quiet about
    -- it.
    --
    -- The provider's vocabulary in this table is a cost, not a preference, and
    -- it is one this schema already pays: dbo.Users."SubjectId" is the same
    -- kind of borrowed identifier. Nothing reads it back out -- it is never
    -- returned by dbo.GetSecurityEvents and never reaches the browser.
    --
    -- NULL on everything that is not a login. Postgres counts NULLs as distinct
    -- in a unique constraint, so those rows are unconstrained by it.
    "SessionId" varchar(64),
    "OccurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ReviewedAt" TIMESTAMPTZ, -- when it was answered, NULL while it has not been
    "Recognized" boolean, -- true is "yes, it was me", false is "no, secure my account"
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "CK_SecurityEvents_Reviewed" CHECK (("ReviewedAt" IS NULL) = ("Recognized" IS NULL)),
    -- One login per session per account. See "SessionId" above.
    CONSTRAINT "UX_SecurityEvents_Session" UNIQUE ("UserUUID", "SessionId")
);

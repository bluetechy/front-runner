--
-- A named body of work an organization is tracking. The drafts called this
-- both "Roadmaps" and "RoadmapWorkflow"; they are the same thing.
--
CREATE TABLE "dbo"."Roadmaps" (
    "RoadmapUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "OrganizationUUID" uuid NOT NULL,
    "Name" varchar(64) NOT NULL,
    "Description" text,
    "IsEnabled" boolean NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

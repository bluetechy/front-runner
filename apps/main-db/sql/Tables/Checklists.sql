--
-- One row per checklist item, not per checklist -- the draft's name, kept.
--
CREATE TABLE "dbo"."Checklists" (
    "ChecklistUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "TaskUUID" uuid NOT NULL,
    "Description" text NOT NULL,
    "IsCompleted" boolean NOT NULL DEFAULT false,
    "SortOrder" integer NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

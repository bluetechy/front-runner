--
-- One row per change to a task. "UserUUID" is nullable because not every
-- change has a person behind it. This is a log, not the audit columns: those
-- say who last touched a row, this says what they did to it.
--
CREATE TABLE "dbo"."TaskHistory" (
    "TaskHistoryUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "TaskUUID" uuid NOT NULL,
    "UserUUID" uuid, -- NULL when the change was not made by a person
    "ChangeType" varchar(50) NOT NULL, -- which column moved, e.g. 'Status', 'DueDate'
    "OldValue" text,
    "NewValue" text,
    "ChangedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

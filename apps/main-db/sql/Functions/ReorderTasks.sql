--
-- Put tasks in an order. The array is the order: the first task gets
-- "SortOrder" 1, the second 2, and so on. Returns how many were moved.
--
-- From the ReorderTasks procedure, which could not have run. Three faults, and
-- the third is the interesting one:
--
--   * `FOR TaskId, position IN ARRAY TaskIds` is not plpgsql. Walking an array
--     and keeping the index is `unnest(...) WITH ORDINALITY`, which is one
--     statement and needs no loop at all.
--   * it wrote RoadmapWorkflowTasks, which never existed; the column is
--     dbo.Tasks."SortOrder".
--   * `WHERE TaskId = TaskId` compares the parameter to itself, so it is true
--     for every row. The procedure would have given every task in the table
--     the same order number -- the last one in the array. "Shadowed
--     parameters" in SCHEMA-NOTES.md has the rest of that family.
--
-- Positions start at 1 and come from the array, not from the roadmap: pass one
-- roadmap's tasks and they are numbered 1..n within it. Nothing stops a caller
-- mixing roadmaps, or including a task with no roadmap at all -- "SortOrder"
-- is only ever read alongside a roadmap filter, so a shared number across two
-- of them means nothing either way.
--
-- It also took no organization and checked no membership, so anyone could have
-- reordered anyone's tasks. Every task named has to be in _OrganizationUUID
-- and named once; a partial reorder is worse than a refused one, so a task
-- from elsewhere -- or listed twice -- raises rather than moving the rest.
--
CREATE FUNCTION "dbo"."ReorderTasks" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _TaskUUIDs uuid[]
) RETURNS integer AS $$
    DECLARE
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
        _Given integer = COALESCE(array_length(_TaskUUIDs, 1), 0);
        _Moved integer;
    BEGIN
        IF _IsMemberOfOrganization IS NOT true THEN
            RAISE EXCEPTION 'ReorderTasks: % does not belong to this organization', _LoginName;
        END IF;

        IF _Given <> (SELECT count(DISTINCT "Wanted") FROM unnest(_TaskUUIDs) AS "Wanted") THEN
            RAISE EXCEPTION 'ReorderTasks: the same task was listed more than once';
        END IF;

        WITH "Ordered" AS (
            SELECT "Wanted", "Position"
            FROM unnest(_TaskUUIDs) WITH ORDINALITY AS "Listed"("Wanted", "Position")
        )
        UPDATE "dbo"."Tasks" SET
            "SortOrder" = "Ordered"."Position",
            "UpdatedBy" = _LoginName
        FROM "Ordered"
        WHERE "Tasks"."TaskUUID" = "Ordered"."Wanted"
            AND "Tasks"."OrganizationUUID" = _OrganizationUUID;

        GET DIAGNOSTICS _Moved = ROW_COUNT;

        IF _Moved <> _Given THEN
            RAISE EXCEPTION 'ReorderTasks: % of the % tasks are not in this organization', _Given - _Moved, _Given;
        END IF;

        RETURN _Moved;
    END;
$$ LANGUAGE plpgsql;

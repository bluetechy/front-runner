CREATE OR REPLACE PROCEDURE ReorderTasks(TaskIds INT[])
AS $$
DECLARE
    TaskId INT;
    position INT;
BEGIN
    FOR TaskId, position IN ARRAY TaskIds
        LOOP
            UPDATE RoadmapWorkflowTasks
            SET TaskOrder = position
            WHERE TaskId = TaskId;
        END LOOP;
END;
$$ LANGUAGE plpgsql;

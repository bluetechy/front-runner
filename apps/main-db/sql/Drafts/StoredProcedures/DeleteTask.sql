CREATE OR REPLACE PROCEDURE DeleteTask(TaskId INT)
AS $$
BEGIN
    DELETE FROM RoadmapWorkflowTasks WHERE TaskId = TaskId;
END;
$$ LANGUAGE plpgsql;

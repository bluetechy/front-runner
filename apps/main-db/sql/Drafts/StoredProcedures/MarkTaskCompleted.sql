CREATE OR REPLACE PROCEDURE MarkTaskCompleted(TaskId INT)
AS $$
BEGIN
    UPDATE RoadmapWorkflowTasks
    SET Completed = true
    WHERE TaskId = TaskId;
END;
$$ LANGUAGE plpgsql;

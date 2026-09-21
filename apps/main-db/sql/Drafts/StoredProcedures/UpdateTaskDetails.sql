CREATE OR REPLACE PROCEDURE UpdateTaskDetails(
    TaskId INT,
    TaskName VARCHAR(100),
    TaskDescription TEXT,
    DueDate DATE
)
AS $$
BEGIN
    UPDATE RoadmapWorkflowTasks
    SET
        Name = TaskName,
        Description = TaskDescription,
        DueDate = DueDate
    WHERE
            TaskId = TaskId;
END;
$$ LANGUAGE plpgsql;

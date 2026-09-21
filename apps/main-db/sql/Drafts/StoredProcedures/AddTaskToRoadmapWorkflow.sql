CREATE OR REPLACE PROCEDURE AddTaskToRoadmapWorkflow(
    RoadmapWorkflowId INT,
    TaskName VARCHAR(100),
    TaskDescription TEXT,
    DueDate DATE
)
AS $$
BEGIN
    INSERT INTO RoadmapWorkflowTasks (RoadmapWorkflowId, Name, Description, DueDate)
    VALUES (RoadmapWorkflowId, TaskName, TaskDescription, DueDate);
END;
$$ LANGUAGE plpgsql;

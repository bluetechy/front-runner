CREATE OR REPLACE FUNCTION GetTasksForRoadmapWorkflow(RoadmapWorkflowId INT)
    RETURNS TABLE (
                      TaskId INT,
                      Name VARCHAR(100),
                      Description TEXT,
                      DueDate DATE,
                      Completed BOOLEAN
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT TaskId, Name, Description, DueDate, Completed
        FROM RoadmapWorkflowTasks
        WHERE RoadmapWorkflowId = RoadmapWorkflowId;
END;
$$ LANGUAGE plpgsql;

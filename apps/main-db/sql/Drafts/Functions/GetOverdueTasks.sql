CREATE OR REPLACE FUNCTION GetOverdueTasks()
    RETURNS TABLE (
                      TaskId INT,
                      Name VARCHAR(100),
                      Description TEXT,
                      DueDate DATE
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT TaskId, Name, Description, DueDate
        FROM RoadmapWorkflowTasks
        WHERE DueDate < CURRENT_DATE AND Completed = false;
END;
$$ LANGUAGE plpgsql;

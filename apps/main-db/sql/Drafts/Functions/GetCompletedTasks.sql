CREATE OR REPLACE FUNCTION GetCompletedTasks()
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
        WHERE Completed = true;
END;
$$ LANGUAGE plpgsql;
